/**
 * BullMQ Queue Definitions
 */
import { Queue } from 'bullmq';
import redisConnection from './redis';

// Queue for catalog updates (comets, etc.)
export const catalogUpdateQueue = new Queue('catalog-updates', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
    },
    removeOnFail: {
      count: 50, // Keep last 50 failed jobs
    },
  },
});

// Job type definitions
export interface UpdateCometsJobData {
  maxMagnitude?: number;
}

export interface CleanupOldDataJobData {
  daysOld: number;
}

/**
 * Add a job to update comets from COBS
 */
export async function scheduleUpdateComets(data: UpdateCometsJobData = {}) {
  return catalogUpdateQueue.add(
    'update-comets',
    { maxMagnitude: data.maxMagnitude || 15 },
    {
      jobId: `update-comets-${Date.now()}`,
    }
  );
}

/**
 * Add a recurring job to update comets weekly
 */
export async function scheduleRecurringCometUpdates() {
  return catalogUpdateQueue.add(
    'update-comets',
    { maxMagnitude: 15 },
    {
      repeat: {
        pattern: '0 0 * * 0', // Every Sunday at midnight (cron format)
      },
      jobId: 'recurring-comet-update',
    }
  );
}

/**
 * Add a job to cleanup old dynamic data
 */
export async function scheduleDataCleanup(daysOld: number = 30) {
  return catalogUpdateQueue.add(
    'cleanup-old-data',
    { daysOld },
    {
      jobId: `cleanup-${Date.now()}`,
    }
  );
}
