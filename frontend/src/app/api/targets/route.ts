import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getTargetVisibility, calculatePlanetPosition, fetchCometPositions, calculateMoonMagnitude } from '@/utils/visibility';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
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

  const where = {
    AND: [
      search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { catalogId: { contains: search, mode: 'insensitive' as const } },
              { messierId: { contains: search, mode: 'insensitive' as const } },
              { ngcId: { contains: search, mode: 'insensitive' as const } },
              { icId: { contains: search, mode: 'insensitive' as const } },
              { otherNames: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {},
      type ? { type: { equals: type } } : {},
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

  const [targets, total] = await Promise.all([
    prisma.target.findMany({
      where,
      orderBy: getOrderBy() as any,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.target.count({ where }),
  ]);

  // Calculate visibility if location is provided
  let targetsWithVisibility = targets;

  if (latitude !== undefined && longitude !== undefined) {
    const location = { latitude, longitude };
    const now = new Date();

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

    return NextResponse.json({
      targets: targetsWithVisibility,
      pagination: {
        page,
        limit,
        total: total, // Use the actual database count, not filtered count
        totalPages: Math.ceil(total / limit),
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
