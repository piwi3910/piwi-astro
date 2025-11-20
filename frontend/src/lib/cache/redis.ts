import Redis from 'ioredis';

/**
 * Redis client for caching
 *
 * Used for:
 * - Target catalog cache (rarely changes)
 * - Search results cache (5-15 min TTL)
 * - Visibility calculations cache (1 hour TTL)
 * - Tonight's best cache (1 hour TTL)
 *
 * NOT used for:
 * - Solar system object positions (needs real-time accuracy)
 * - Comet positions (needs real-time accuracy)
 */

let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
  // If Redis is disabled or not configured, return null
  if (process.env.REDIS_DISABLED === 'true') {
    return null;
  }

  // Create client if it doesn't exist
  if (!redis) {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        // Connect immediately (not lazy)
        lazyConnect: false,
        // Don't throw on connection errors
        enableReadyCheck: false,
      });

      // Handle connection errors without crashing
      redis.on('error', (err) => {
        console.error('❌ Redis connection error:', err.message);
        console.log('⚠️  Continuing without cache...');
      });

      redis.on('connect', () => {
        console.log('✅ Redis connected');
      });

      redis.on('ready', () => {
        console.log('✅ Redis ready');
      });

    } catch (error) {
      console.error('❌ Error creating Redis client:', error);
      redis = null;
    }
  }

  return redis;
}

/**
 * Cache wrapper with automatic error handling
 */
export async function getCached<T>(
  key: string,
  fallback: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const client = getRedisClient();

  // If Redis is not available, just run the fallback
  if (!client) {
    return fallback();
  }

  try {
    // Try to get from cache
    const cached = await client.get(key);

    if (cached) {
      console.log(`✅ Cache hit: ${key}`);
      return JSON.parse(cached) as T;
    }

    console.log(`⚠️  Cache miss: ${key}`);

    // Not in cache, run fallback
    const result = await fallback();

    // Store in cache
    if (ttl) {
      await client.setex(key, ttl, JSON.stringify(result));
    } else {
      await client.set(key, JSON.stringify(result));
    }

    return result;

  } catch (error) {
    console.error(`❌ Cache error for ${key}:`, error);
    // On error, just run the fallback
    return fallback();
  }
}

/**
 * Invalidate cache by key pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
  const client = getRedisClient();

  if (!client) return;

  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
      console.log(`✅ Invalidated ${keys.length} cache keys matching: ${pattern}`);
    }
  } catch (error) {
    console.error(`❌ Error invalidating cache for ${pattern}:`, error);
  }
}

/**
 * Set a value in cache
 */
export async function setCache(key: string, value: any, ttl?: number): Promise<void> {
  const client = getRedisClient();

  if (!client) return;

  try {
    if (ttl) {
      await client.setex(key, ttl, JSON.stringify(value));
    } else {
      await client.set(key, JSON.stringify(value));
    }
  } catch (error) {
    console.error(`❌ Error setting cache for ${key}:`, error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  connected: boolean;
  keys: number;
  memory: string;
} | null> {
  const client = getRedisClient();

  if (!client) {
    return { connected: false, keys: 0, memory: '0' };
  }

  try {
    const info = await client.info('memory');
    const dbSize = await client.dbsize();
    const memoryMatch = info.match(/used_memory_human:(.+)/);
    const memory = memoryMatch ? memoryMatch[1].trim() : '0';

    return {
      connected: true,
      keys: dbSize,
      memory,
    };
  } catch (error) {
    console.error('❌ Error getting cache stats:', error);
    return null;
  }
}
