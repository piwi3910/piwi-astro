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

// Queue for image processing (metadata extraction, plate solving)
export const imageProcessingQueue = new Queue('image-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 500, // Keep last 500 completed jobs
    },
    removeOnFail: {
      count: 200, // Keep last 200 failed jobs for debugging
    },
  },
});

// Job type definitions for catalog updates
export interface UpdateCometsJobData {
  maxMagnitude?: number;
}

// Job type definitions for image processing
export interface ProcessImageJobData {
  jobId: string; // ImageProcessingJob.id from database
  userId: string;
  storageKey: string;
  originalName: string;
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

/**
 * Add a job to process an uploaded image
 */
export async function scheduleImageProcessing(data: ProcessImageJobData) {
  return imageProcessingQueue.add('process-image', data, {
    jobId: `process-image-${data.jobId}`,
  });
}

/**
 * Get the status of an image processing job from BullMQ
 */
export async function getImageProcessingJobStatus(jobId: string) {
  const job = await imageProcessingQueue.getJob(`process-image-${jobId}`);
  if (!job) return null;

  const state = await job.getState();
  const progress = job.progress;

  return {
    state,
    progress,
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason,
  };
}
