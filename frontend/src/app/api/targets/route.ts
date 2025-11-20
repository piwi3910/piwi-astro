import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getTargetVisibility, calculatePlanetPosition, fetchCometPositions, calculateMoonMagnitude, calculateAltitudeOverTime, calculateSunAltitudeOverTime } from '@/utils/visibility';

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
      magnitudeMin !== undefined ? { magnitude: { gte: magnitudeMin } } : {},
      magnitudeMax !== undefined ? { magnitude: { lte: magnitudeMax } } : {},
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

  if (sortBy === 'tonights-best' && latitude !== undefined && longitude !== undefined) {
    // For tonight's best, we need to calculate visibility for sorting
    // Fetch all matching targets (within reason - use WHERE clause to limit)
    const allTargets = await prisma.target.findMany({
      where,
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

    // Paginate the sorted results
    const startIndex = (page - 1) * limit;
    const paginatedTargets = sortedTargets
      .slice(startIndex, startIndex + limit)
      .map(item => item.target);

    targets = paginatedTargets;
    total = totalCount; // Total targets (not filtered by visibility)
  } else {
    // Standard sorting (magnitude, size)
    [targets, total] = await Promise.all([
      prisma.target.findMany({
        where,
        orderBy: getOrderBy() as any,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.target.count({ where }),
    ]);
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
  let finalTargets = targetsWithVisibility;

  if (applyAdvancedFilters && latitude !== undefined && longitude !== undefined) {
    const startOfDay = new Date(observationDate);
    startOfDay.setHours(0, 0, 0, 0);
    const location = { latitude, longitude };

    // Fetch rig if FOV filtering is requested
    let rig = null;
    if (rigId && fovCoverageMin !== undefined && fovCoverageMax !== undefined) {
      rig = await prisma.rig.findUnique({ where: { id: rigId } });
    }

    // Filter targets based on advanced criteria
    finalTargets = targetsWithVisibility.filter(target => {
      // Calculate target coordinates
      let targetCoords = { raDeg: target.raDeg, decDeg: target.decDeg };
      if (target.dynamicRaDeg !== undefined && target.dynamicDecDeg !== undefined) {
        targetCoords = { raDeg: target.dynamicRaDeg, decDeg: target.dynamicDecDeg };
      } else if (target.isDynamic && target.solarSystemBody) {
        targetCoords = calculatePlanetPosition(target.solarSystemBody, startOfDay);
      }

      // Calculate altitude over time
      const points = calculateAltitudeOverTime(
        targetCoords,
        location,
        startOfDay,
        24,
        30
      );

      // FOV Coverage Filter
      if (rig && target.sizeMajorArcmin && fovCoverageMin !== undefined && fovCoverageMax !== undefined) {
        const fovWidthArcmin = rig.fovWidthArcmin;
        const coveragePercent = (target.sizeMajorArcmin / fovWidthArcmin) * 100;
        if (coveragePercent < fovCoverageMin || coveragePercent > fovCoverageMax) {
          return false;
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

      return hasValidPoint;
    });
  }

    return NextResponse.json({
      targets: finalTargets,
      pagination: {
        page,
        limit,
        total: finalTargets.length, // Total after filtering
        totalPages: Math.ceil(finalTargets.length / limit),
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
