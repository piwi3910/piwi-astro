/**
 * Redis Connection for BullMQ
 */
import { Redis } from 'ioredis';

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisConnection.on('error', (error) => {
  console.error('❌ Redis connection error:', error);
});

redisConnection.on('connect', () => {
  console.log('✅ Redis connected');
});

export default redisConnection;
