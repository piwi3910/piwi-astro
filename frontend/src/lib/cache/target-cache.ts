import { getCached, invalidateCache, setCache } from './redis';

/**
 * Cache TTL constants (in seconds)
 */
export const CACHE_TTL = {
  TARGET_CATALOG: 24 * 60 * 60,      // 24 hours (catalog rarely changes)
  SEARCH_RESULTS: 15 * 60,            // 15 minutes
  VISIBILITY_CALC: 60 * 60,           // 1 hour (positions change slowly)
  TONIGHTS_BEST: 60 * 60,             // 1 hour
};

/**
 * Cache key generators
 */
export const CACHE_KEYS = {
  targetCatalog: () => 'targets:all',

  searchResults: (search: string, filters: Record<string, any>, page: number) => {
    // Create a stable, readable cache key from filters
    const filterParts = [
      filters.types?.length ? `types:${filters.types.join(',')}` : '',
      filters.constellation ? `const:${filters.constellation}` : '',
      filters.magnitudeMin !== undefined ? `magMin:${filters.magnitudeMin}` : '',
      filters.magnitudeMax !== undefined ? `magMax:${filters.magnitudeMax}` : '',
      filters.sizeMin !== undefined ? `sizeMin:${filters.sizeMin}` : '',
      filters.sizeMax !== undefined ? `sizeMax:${filters.sizeMax}` : '',
      filters.sortBy ? `sort:${filters.sortBy}` : '',
      filters.sortDirection ? `dir:${filters.sortDirection}` : '',
    ].filter(Boolean).join(':');

    return `search:${search}:${filterParts}:page:${page}`;
  },

  visibilityCalc: (targetId: string, lat: number, lng: number, date: string) => {
    // Round coordinates to 2 decimal places to increase cache hits
    const latRounded = Math.round(lat * 100) / 100;
    const lngRounded = Math.round(lng * 100) / 100;
    // Use date without time for daily caching
    const dateOnly = date.split('T')[0];
    return `visibility:${targetId}:${latRounded}:${lngRounded}:${dateOnly}`;
  },

  tonightsBest: (lat: number, lng: number, date: string, filters: Record<string, any>) => {
    const latRounded = Math.round(lat * 100) / 100;
    const lngRounded = Math.round(lng * 100) / 100;
    const dateOnly = date.split('T')[0];

    // Create a stable, readable cache key from filters (avoid hash collisions)
    const filterParts = [
      filters.search ? `search:${filters.search}` : '',
      filters.types?.length ? `types:${filters.types.join(',')}` : '',
      filters.constellation ? `const:${filters.constellation}` : '',
      filters.magnitudeMin !== undefined ? `magMin:${filters.magnitudeMin}` : '',
      filters.magnitudeMax !== undefined ? `magMax:${filters.magnitudeMax}` : '',
      filters.sizeMin !== undefined ? `sizeMin:${filters.sizeMin}` : '',
      filters.sizeMax !== undefined ? `sizeMax:${filters.sizeMax}` : '',
    ].filter(Boolean).join(':');

    return `tonights-best:${latRounded}:${lngRounded}:${dateOnly}:${filterParts}`;
  },
};

/**
 * 1. Target Catalog Cache
 *
 * Cache the entire target catalog (13K targets)
 * TTL: 24 hours (catalog data rarely changes)
 */
export async function getCachedTargetCatalog<T>(
  fetchFn: () => Promise<T>
): Promise<T> {
  return getCached(
    CACHE_KEYS.targetCatalog(),
    fetchFn,
    CACHE_TTL.TARGET_CATALOG
  );
}

/**
 * Invalidate target catalog cache
 * Call this when targets are added/updated/deleted
 */
export async function invalidateTargetCatalog(): Promise<void> {
  await invalidateCache(CACHE_KEYS.targetCatalog());
}

/**
 * 2. Search Results Cache
 *
 * Cache search query results
 * TTL: 15 minutes (balance between freshness and performance)
 */
export async function getCachedSearchResults<T>(
  search: string,
  filters: Record<string, any>,
  page: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const key = CACHE_KEYS.searchResults(search, filters, page);

  return getCached(key, fetchFn, CACHE_TTL.SEARCH_RESULTS);
}

/**
 * Invalidate all search result caches
 */
export async function invalidateSearchResults(): Promise<void> {
  await invalidateCache('search:*');
}

/**
 * 3. Visibility Calculations Cache
 *
 * Cache visibility calculations for a target at a location on a date
 * TTL: 1 hour (astronomical positions change slowly)
 *
 * NOTE: Do NOT use this for solar system objects (planets, comets, moon)
 * as they need real-time accuracy
 */
export async function getCachedVisibility<T>(
  targetId: string,
  latitude: number,
  longitude: number,
  date: Date,
  fetchFn: () => Promise<T>,
  isDynamic: boolean = false
): Promise<T> {
  // NEVER cache dynamic objects (planets, comets, moon)
  if (isDynamic) {
    console.log(`⚠️  Skipping cache for dynamic object: ${targetId}`);
    return fetchFn();
  }

  const key = CACHE_KEYS.visibilityCalc(
    targetId,
    latitude,
    longitude,
    date.toISOString()
  );

  return getCached(key, fetchFn, CACHE_TTL.VISIBILITY_CALC);
}

/**
 * Batch cache visibility for multiple targets
 *
 * Returns cached values for targets that are in cache,
 * and marks which targets need calculation
 */
export async function getBatchCachedVisibility(
  targets: Array<{ id: string; isDynamic: boolean }>,
  latitude: number,
  longitude: number,
  date: Date
): Promise<{
  cached: Map<string, any>;
  needsCalculation: string[];
}> {
  const cached = new Map<string, any>();
  const needsCalculation: string[] = [];

  for (const target of targets) {
    // Skip caching for dynamic objects
    if (target.isDynamic) {
      needsCalculation.push(target.id);
      continue;
    }

    const key = CACHE_KEYS.visibilityCalc(
      target.id,
      latitude,
      longitude,
      date.toISOString()
    );

    try {
      const client = await import('./redis').then(m => m.getRedisClient());
      if (client) {
        const value = await client.get(key);
        if (value) {
          cached.set(target.id, JSON.parse(value));
          continue;
        }
      }
    } catch (error) {
      console.error(`Error getting cached visibility for ${target.id}:`, error);
    }

    needsCalculation.push(target.id);
  }

  console.log(
    `✅ Batch visibility cache: ${cached.size} cached, ${needsCalculation.length} need calculation`
  );

  return { cached, needsCalculation };
}

/**
 * Store batch visibility calculations
 */
export async function setBatchVisibility(
  visibilityData: Map<string, any>,
  latitude: number,
  longitude: number,
  date: Date
): Promise<void> {
  const promises: Promise<void>[] = [];

  for (const [targetId, data] of visibilityData.entries()) {
    const key = CACHE_KEYS.visibilityCalc(
      targetId,
      latitude,
      longitude,
      date.toISOString()
    );

    promises.push(setCache(key, data, CACHE_TTL.VISIBILITY_CALC));
  }

  await Promise.all(promises);
  console.log(`✅ Stored ${promises.length} visibility calculations in cache`);
}

/**
 * Invalidate visibility cache for a specific location
 */
export async function invalidateVisibilityForLocation(
  latitude: number,
  longitude: number
): Promise<void> {
  const latRounded = Math.round(latitude * 100) / 100;
  const lngRounded = Math.round(longitude * 100) / 100;
  await invalidateCache(`visibility:*:${latRounded}:${lngRounded}:*`);
}

/**
 * 4. Tonight's Best Cache
 *
 * Cache sorted "tonight's best" target IDs for a location
 * TTL: 1 hour
 */
export async function getCachedTonightsBest<T>(
  latitude: number,
  longitude: number,
  date: Date,
  filters: Record<string, any>,
  fetchFn: () => Promise<T>
): Promise<T> {
  const key = CACHE_KEYS.tonightsBest(
    latitude,
    longitude,
    date.toISOString(),
    filters
  );

  return getCached(key, fetchFn, CACHE_TTL.TONIGHTS_BEST);
}

/**
 * Invalidate tonight's best cache
 */
export async function invalidateTonightsBest(): Promise<void> {
  await invalidateCache('tonights-best:*');
}

/**
 * Invalidate all target-related caches
 * Use when target data is updated
 */
export async function invalidateAllTargetCaches(): Promise<void> {
  await Promise.all([
    invalidateTargetCatalog(),
    invalidateSearchResults(),
    invalidateCache('visibility:*'),
    invalidateTonightsBest(),
  ]);
  console.log('✅ Invalidated all target caches');
}
