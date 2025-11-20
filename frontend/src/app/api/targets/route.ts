import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getTargetVisibility, calculatePlanetPosition, fetchCometPositions, calculateMoonMagnitude, calculateAltitudeOverTime, calculateSunAltitudeOverTime } from '@/utils/visibility';
import { getCachedSearchResults, getCachedTonightsBest } from '@/lib/cache/target-cache';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || '';
    const typeParam = searchParams.get('type') || '';
    const types = typeParam ? typeParam.split(',').filter(Boolean) : [];
    const constellation = searchParams.get('constellation') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

  // Advanced filters
  const magnitudeMin = searchParams.get('magnitudeMin')
    ? parseFloat(searchParams.get('magnitudeMin')!)
    : undefined;
  const magnitudeMax = searchParams.get('magnitudeMax')
    ? parseFloat(searchParams.get('magnitudeMax')!)
    : undefined;
  const sizeMin = searchParams.get('sizeMin')
    ? parseFloat(searchParams.get('sizeMin')!)
    : undefined;
  const sizeMax = searchParams.get('sizeMax')
    ? parseFloat(searchParams.get('sizeMax')!)
    : undefined;

  // Sorting parameters
  const sortBy = searchParams.get('sortBy') || 'magnitude';
  const sortDirection = searchParams.get('sortDirection') || 'desc';

  // Location for visibility calculations
  const latitude = searchParams.get('latitude')
    ? parseFloat(searchParams.get('latitude')!)
    : undefined;
  const longitude = searchParams.get('longitude')
    ? parseFloat(searchParams.get('longitude')!)
    : undefined;
  const minAltitude = searchParams.get('minAltitude')
    ? parseFloat(searchParams.get('minAltitude')!)
    : undefined;

  // Date for astronomical calculations (defaults to today)
  const dateParam = searchParams.get('date');
  const observationDate = dateParam ? new Date(dateParam) : new Date();

  // Advanced filtering parameters (from frontend)
  const applyAdvancedFilters = searchParams.get('applyAdvancedFilters') === 'true';
  const timeWindowStart = searchParams.get('timeWindowStart')
    ? parseFloat(searchParams.get('timeWindowStart')!)
    : undefined;
  const timeWindowEnd = searchParams.get('timeWindowEnd')
    ? parseFloat(searchParams.get('timeWindowEnd')!)
    : undefined;
  const altitudeMin = searchParams.get('altitudeMin')
    ? parseFloat(searchParams.get('altitudeMin')!)
    : undefined;
  const altitudeMax = searchParams.get('altitudeMax')
    ? parseFloat(searchParams.get('altitudeMax')!)
    : undefined;
  const azimuthSegmentsParam = searchParams.get('azimuthSegments');
  const azimuthSegments = azimuthSegmentsParam
    ? azimuthSegmentsParam.split('').map(s => s === '1')
    : undefined;
  const rigId = searchParams.get('rigId') || undefined;
  const fovCoverageMin = searchParams.get('fovCoverageMin')
    ? parseFloat(searchParams.get('fovCoverageMin')!)
    : undefined;
  const fovCoverageMax = searchParams.get('fovCoverageMax')
    ? parseFloat(searchParams.get('fovCoverageMax')!)
    : undefined;

  // Normalize search query (remove spaces for catalog IDs)
  const normalizedSearch = search.replace(/\s+/g, '');

  // Field selection - only fetch fields needed for list view (performance optimization)
  const selectFields = {
    id: true,
    catalogId: true,
    name: true,
    type: true,
    subType: true,
    raDeg: true,
    decDeg: true,
    sizeMajorArcmin: true,
    sizeMinorArcmin: true,
    magnitude: true,
    constellation: true,
    messierId: true,
    ngcId: true,
    icId: true,
    otherNames: true,
    isDynamic: true,
    solarSystemBody: true,
    previewImageUrl: true,
    thumbnailUrl: true,
    // Exclude: surfaceBrightness, comet data, orbital elements, metadata
  };

  const where = {
    AND: [
      search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { catalogId: { contains: normalizedSearch, mode: 'insensitive' as const } },
              { messierId: { contains: normalizedSearch, mode: 'insensitive' as const } },
              { ngcId: { contains: normalizedSearch, mode: 'insensitive' as const } },
              { icId: { contains: normalizedSearch, mode: 'insensitive' as const } },
              { otherNames: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {},
      types.length > 0 ? { type: { in: types } } : {},
      constellation ? { constellation: { equals: constellation } } : {},
      // Magnitude filter: include targets in range OR with null magnitude
      (magnitudeMin !== undefined || magnitudeMax !== undefined) ? {
        OR: [
          {
            AND: [
              magnitudeMin !== undefined ? { magnitude: { gte: magnitudeMin } } : {},
              magnitudeMax !== undefined ? { magnitude: { lte: magnitudeMax } } : {},
            ].filter(obj => Object.keys(obj).length > 0)
          },
          { magnitude: null }
        ]
      } : {},
      sizeMin !== undefined ? { sizeMajorArcmin: { gte: sizeMin } } : {},
      sizeMax !== undefined ? { sizeMajorArcmin: { lte: sizeMax } } : {},
    ],
  };

  // Build orderBy clause
  // For magnitude: 'desc' means brightest first (which is lower/more negative values = 'asc' in DB)
  // For size: 'desc' means largest first (which is higher values = 'desc' in DB)
  const getOrderBy = () => {
    if (sortBy === 'magnitude') {
      // Flip the direction for magnitude: user's 'desc' = DB 'asc' (brightest first)
      const dbDirection = sortDirection === 'desc' ? 'asc' : 'desc';
      return [{ magnitude: dbDirection }, { name: 'asc' }];
    } else if (sortBy === 'size') {
      // For size, always put null values at the end
      const dbDirection = sortDirection === 'desc' ? 'desc' : 'asc';
      return [
        {
          sizeMajorArcmin: {
            sort: dbDirection,
            nulls: 'last' as const
          }
        },
        { name: 'asc' }
      ];
    }
    // Default fallback
    return [{ magnitude: 'asc' }, { name: 'asc' }];
  };

  // Special handling for "tonights-best" sorting
  let targets, total;
  let cachedResult: { sortedTargetIds: string[]; totalCount: number } | null = null;

  if (sortBy === 'tonights-best' && latitude !== undefined && longitude !== undefined) {
    // Cache key includes filters to cache different filter combinations separately
    const cacheFilters = {
      search,
      types,
      constellation,
      magnitudeMin,
      magnitudeMax,
      sizeMin,
      sizeMax,
    };

    // Wrap the entire expensive calculation in cache
    cachedResult = await getCachedTonightsBest(
      latitude,
      longitude,
      observationDate,
      cacheFilters,
      async () => {
        console.log('💫 Calculating tonights best (not cached)...');

        // For tonight's best, we need to calculate visibility for sorting
        // Fetch all matching targets (within reason - use WHERE clause to limit)
        const allTargets = await prisma.target.findMany({
          where,
          select: selectFields,
          orderBy: [{ magnitude: 'asc' }, { name: 'asc' }], // Baseline order
        });

        const totalCount = allTargets.length;

        // Calculate astronomical night visibility for each target
        const startOfDay = new Date(observationDate);
        startOfDay.setHours(0, 0, 0, 0);

        const location = { latitude, longitude };

        const targetsWithVisibility = allTargets.map(target => {
      let targetCoords = { raDeg: target.raDeg, decDeg: target.decDeg };

      // Handle dynamic objects
      if (target.isDynamic && target.solarSystemBody) {
        targetCoords = calculatePlanetPosition(target.solarSystemBody, startOfDay);
      }

      // Calculate altitude points over 24 hours
      const points = calculateAltitudeOverTime(
        targetCoords,
        location,
        startOfDay,
        24,
        30 // 30-minute intervals
      );

      const sunPoints = calculateSunAltitudeOverTime(
        location,
        startOfDay,
        24,
        30
      );

      // Calculate visibility during astronomical night (sun < -18°)
      let visibleMinutes = 0;
      let maxAltitude = 0;

      points.forEach((point, i) => {
        const sunAlt = sunPoints[i]?.altitude ?? 999;

        if (sunAlt < -18 && point.altitude > 0) {
          visibleMinutes += 30;
          maxAltitude = Math.max(maxAltitude, point.altitude);
        }
      });

      return {
        target,
        visibleMinutes,
        maxAltitude,
      };
    });

        // Sort by visibility (NO FILTERING - sort only)
        // Targets with zero visibility go to the bottom
        const sortedTargets = targetsWithVisibility.sort((a, b) => {
          if (b.visibleMinutes !== a.visibleMinutes) {
            return b.visibleMinutes - a.visibleMinutes;
          }
          return b.maxAltitude - a.maxAltitude;
        });

        // Return sorted target IDs and total
        return {
          sortedTargetIds: sortedTargets.map(item => item.target.id),
          totalCount,
        };
      }
    );

    // Now paginate the cached sorted results
    const startIndex = (page - 1) * limit;
    const pageTargetIds = cachedResult.sortedTargetIds.slice(startIndex, startIndex + limit);

    // Fetch the actual target data for this page
    const paginatedTargets = await prisma.target.findMany({
      where: { id: { in: pageTargetIds } },
      select: selectFields,
    });

    // Sort the fetched targets to match the cached order
    const targetMap = new Map(paginatedTargets.map(t => [t.id, t]));
    targets = pageTargetIds.map(id => targetMap.get(id)!).filter(Boolean);
    total = cachedResult.totalCount;
  } else {
    // Standard sorting (magnitude, size)
    // Cache search results if there's a search term
    if (search && search.length >= 2) {
      const cacheFilters = {
        types,
        constellation,
        magnitudeMin,
        magnitudeMax,
        sizeMin,
        sizeMax,
        sortBy,
        sortDirection,
      };

      const cachedSearchResult = await getCachedSearchResults(
        search,
        cacheFilters,
        page,
        async () => {
          console.log('🔍 Executing search query (not cached)...');
          const [fetchedTargets, fetchedTotal] = await Promise.all([
            prisma.target.findMany({
              where,
              select: selectFields,
              orderBy: getOrderBy() as any,
              skip: (page - 1) * limit,
              take: limit,
            }),
            prisma.target.count({ where }),
          ]);
          return { targets: fetchedTargets, total: fetchedTotal };
        }
      );

      targets = cachedSearchResult.targets;
      total = cachedSearchResult.total;
    } else {
      // No caching for non-search queries (too many combinations)
      [targets, total] = await Promise.all([
        prisma.target.findMany({
          where,
          select: selectFields,
          orderBy: getOrderBy() as any,
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.target.count({ where }),
      ]);
    }
  }

  // Calculate visibility if location is provided
  let targetsWithVisibility = targets;

  if (latitude !== undefined && longitude !== undefined) {
    const location = { latitude, longitude };
    const now = observationDate; // Use the observation date for consistency

    // Check if there are any comets in the result set
    const hasComets = targets.some((t) => t.type === 'Comet');

    // Fetch comet positions from COBS if there are comets
    let cometPositions = new Map();
    if (hasComets) {
      cometPositions = await fetchCometPositions(location, now);
    }

    targetsWithVisibility = targets
      .map((target) => {
        // For dynamic objects, calculate current position
        let coords = { raDeg: target.raDeg, decDeg: target.decDeg };
        let dynamicMagnitude: number | undefined;

        // Planets and Moon
        if (target.isDynamic && target.solarSystemBody) {
          coords = calculatePlanetPosition(target.solarSystemBody, now);

          // Calculate dynamic magnitude for Moon based on current phase
          if (target.solarSystemBody === 'Moon') {
            dynamicMagnitude = calculateMoonMagnitude(now);
          }
        }
        // Comets
        else if (target.type === 'Comet' && target.catalogId) {
          const cometPos = cometPositions.get(target.catalogId);
          if (cometPos) {
            coords = { raDeg: cometPos.raDeg, decDeg: cometPos.decDeg };
          }
        }

        const visibility = getTargetVisibility(
          coords,
          location,
          now
        );

        return {
          ...target,
          // Include dynamic coordinates for display
          ...(target.isDynamic || target.type === 'Comet' ? { dynamicRaDeg: coords.raDeg, dynamicDecDeg: coords.decDeg } : {}),
          // Include dynamic magnitude for Moon
          ...(dynamicMagnitude !== undefined ? { magnitude: dynamicMagnitude } : {}),
          currentAltitude: visibility.currentAltitude,
          currentAzimuth: visibility.currentAzimuth,
          isCurrentlyVisible: visibility.isCurrentlyVisible,
        };
      })
      .filter((target) => {
        // Filter by minimum altitude if specified
        if (minAltitude !== undefined) {
          return target.currentAltitude >= minAltitude;
        }
        return true;
      });
  }

  // Apply advanced filtering if enabled
  // IMPORTANT: Advanced filtering must happen BEFORE pagination
  let finalTargets = targetsWithVisibility;
  let finalTotal = total;

  if (applyAdvancedFilters && latitude !== undefined && longitude !== undefined) {
    // INCREMENTAL FETCHING OPTIMIZATION:
    // Instead of fetching ALL targets and filtering them, fetch small batches
    // and stop when we have enough results for the requested page.
    // This reduces work from 10K+ targets to ~100-500 targets.

    const startOfDay = new Date(observationDate);
    startOfDay.setHours(0, 0, 0, 0);
    const location = { latitude, longitude };

    // Pre-calculate declination bounds for filtering
    const minVisibleDec = latitude - 90;
    const maxVisibleDec = latitude + 90;

    console.log(`🔍 Starting incremental advanced filtering...`);

    // Step 1: Get sorted IDs (from cache or database)
    let allSortedIds: string[];
    if (sortBy === 'tonights-best' && cachedResult) {
      allSortedIds = cachedResult.sortedTargetIds;
      console.log(`📋 Using cached tonight's best order with ${allSortedIds.length} targets`);
    } else {
      // For non-tonight's-best sorting, fetch all IDs with the requested sort order
      const allTargetsIds = await prisma.target.findMany({
        where,
        select: { id: true },
        orderBy: getOrderBy() as any,
      });
      allSortedIds = allTargetsIds.map(t => t.id);
      console.log(`📋 Fetched ${allSortedIds.length} target IDs with ${sortBy} sorting`);
    }

    // Step 2: Incremental batch processing
    const incrementalBatchSize = 100; // Process 100 targets at a time
    const neededResults = page * limit; // Total results needed to fill requested page
    const bufferMultiplier = 3; // Fetch extra to account for filtering (conservative estimate)

    let processedCount = 0;
    let collectedTargets: any[] = [];
    const totalAvailable = allSortedIds.length;

    console.log(`🎯 Target: Need ${neededResults} results for page ${page} (limit ${limit}), will fetch in batches of ${incrementalBatchSize}`);
    const incrementalStartTime = Date.now();

    // Step 3: Fetch rig if FOV filtering is requested
    let rigFovWidthArcmin: number | null = null;
    if (rigId && fovCoverageMin !== undefined && fovCoverageMax !== undefined) {
      const rig = await prisma.rig.findUnique({
        where: { id: rigId },
        include: { telescope: true, camera: true }
      });

      if (rig) {
        const effectiveFocalLength = rig.telescope.focalLengthMm * (rig.reducerFactor || 1) * (rig.barlowFactor || 1);
        rigFovWidthArcmin = (rig.camera.sensorWidthMm / effectiveFocalLength) * (180 / Math.PI) * 60;
      }
    }

    // Step 4: Pre-fetch comet positions (if we encounter comets, we'll have their data ready)
    const cometPositions = await fetchCometPositions(location, startOfDay);

    // Step 5: Incremental batch processing loop
    while (
      collectedTargets.length < neededResults * bufferMultiplier &&
      processedCount < totalAvailable
    ) {
      // Fetch next batch of target IDs
      const batchIds = allSortedIds.slice(processedCount, processedCount + incrementalBatchSize);

      if (batchIds.length === 0) break;

      // Fetch target data for this batch
      const batchTargets = await prisma.target.findMany({
        where: { id: { in: batchIds } },
        select: selectFields,
      });

      // Create a map to preserve sort order
      const targetMap = new Map(batchTargets.map(t => [t.id, t]));
      const sortedBatchTargets = batchIds.map(id => targetMap.get(id)!).filter(Boolean);

      console.log(`  📦 Batch ${Math.floor(processedCount / incrementalBatchSize) + 1}: Fetched ${sortedBatchTargets.length} targets (${processedCount}-${processedCount + sortedBatchTargets.length} of ${totalAvailable})`);

      // Apply declination pre-filter to batch
      const decFilteredBatch = sortedBatchTargets.filter(t => {
        return t.decDeg >= minVisibleDec && t.decDeg <= maxVisibleDec;
      });

      // Apply visibility calculations and filters to batch
      for (const target of decFilteredBatch) {
        // For dynamic objects, calculate current position
        let coords = { raDeg: target.raDeg, decDeg: target.decDeg };
        let dynamicMagnitude: number | undefined;

        // Planets and Moon
        if (target.isDynamic && target.solarSystemBody) {
          coords = calculatePlanetPosition(target.solarSystemBody, startOfDay);

          // Calculate dynamic magnitude for Moon based on current phase
          if (target.solarSystemBody === 'Moon') {
            dynamicMagnitude = calculateMoonMagnitude(startOfDay);
          }
        }
        // Comets
        else if (target.type === 'Comet' && target.catalogId) {
          const cometPos = cometPositions.get(target.catalogId);
          if (cometPos) {
            coords = { raDeg: cometPos.raDeg, decDeg: cometPos.decDeg };
          }
        }

        const visibility = getTargetVisibility(coords, location, startOfDay);

        // Calculate altitude over time for filtering
        const targetCoords = coords;
        const points = calculateAltitudeOverTime(
          targetCoords,
          location,
          startOfDay,
          24,
          30
        );

        // Apply FOV Coverage Filter
        if (rigFovWidthArcmin && target.sizeMajorArcmin && fovCoverageMin !== undefined && fovCoverageMax !== undefined) {
          const coveragePercent = (target.sizeMajorArcmin / rigFovWidthArcmin) * 100;
          if (coveragePercent < fovCoverageMin || coveragePercent > fovCoverageMax) {
            continue; // Skip this target
          }
        }

        // Check if target has any valid visibility point
        const hasValidPoint = points.some((point, i) => {
          // Time window filter (convert hour to 12-36 scale)
          if (timeWindowStart !== undefined && timeWindowEnd !== undefined) {
            const hour = (i / (points.length - 1)) * 24;
            const hourInWindowScale = hour >= 12 ? hour : hour + 24;
            const inTimeWindow = timeWindowStart <= timeWindowEnd
              ? hourInWindowScale >= timeWindowStart && hourInWindowScale <= timeWindowEnd
              : hourInWindowScale >= timeWindowStart || hourInWindowScale <= timeWindowEnd;
            if (!inTimeWindow) return false;
          }

          // Target must be above horizon
          if (point.altitude <= 0) return false;

          // Altitude range filter
          if (altitudeMin !== undefined && point.altitude < altitudeMin) return false;
          if (altitudeMax !== undefined && point.altitude > altitudeMax) return false;

          // Azimuth segments filter
          if (azimuthSegments) {
            const segmentIndex = Math.floor(point.azimuth / 15) % 24;
            if (!azimuthSegments[segmentIndex]) return false;
          }

          return true;
        });

        // If target passed all filters, add it to results
        if (hasValidPoint) {
          collectedTargets.push({
            ...target,
            ...(target.isDynamic || target.type === 'Comet' ? { dynamicRaDeg: coords.raDeg, dynamicDecDeg: coords.decDeg } : {}),
            ...(dynamicMagnitude !== undefined ? { magnitude: dynamicMagnitude } : {}),
            currentAltitude: visibility.currentAltitude,
            currentAzimuth: visibility.currentAzimuth,
            isCurrentlyVisible: visibility.isCurrentlyVisible,
          });
        }
      }

      processedCount += sortedBatchTargets.length;

      // Log progress
      console.log(`  ✅ Batch complete: ${collectedTargets.length} targets collected so far`);

      // Early exit if we have enough results
      if (collectedTargets.length >= neededResults * bufferMultiplier) {
        console.log(`  🎯 Target reached: ${collectedTargets.length} >= ${neededResults * bufferMultiplier}, stopping early`);
        break;
      }
    }

    // Step 6: Paginate the collected results
    const totalElapsed = Date.now() - incrementalStartTime;
    console.log(`✅ Incremental filtering complete: ${collectedTargets.length} targets passed filters (${totalElapsed}ms, processed ${processedCount}/${totalAvailable} targets)`);

    finalTotal = collectedTargets.length;
    const startIndex = (page - 1) * limit;
    finalTargets = collectedTargets.slice(startIndex, startIndex + limit);
    }

  return NextResponse.json({
      targets: finalTargets,
      pagination: {
        page,
        limit,
        total: finalTotal, // Use correct total: DB total for no filters, filtered total for with filters
        totalPages: Math.ceil(finalTotal / limit),
      },
    });
  } catch (error) {
    console.error('❌ Error in /api/targets:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to fetch targets', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
