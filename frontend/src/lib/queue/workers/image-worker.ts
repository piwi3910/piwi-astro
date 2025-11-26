/**
 * Image Processing Worker
 *
 * Simple pipeline for PNG/JPEG uploads:
 * 1. Download image from MinIO
 * 2. Plate solve via local ASTAP solver to get coordinates
 * 3. Match to target in database
 * 4. Create ImageUpload record
 */
import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import redisConnection from '../redis';
import type { ProcessImageJobData } from '../queues';
import { downloadFileToPath, getPresignedUrl } from '../../minio';
import { solveFieldWithFile } from '../../astap/client';

const prisma = new PrismaClient();

// Supported file extensions (standard image formats only)
const SUPPORTED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
]);

/**
 * Find a matching target in the database by coordinates
 */
async function findMatchingTarget(
  ra: number | null,
  dec: number | null
): Promise<{ targetId: string; matchMethod: string } | null> {
  // Try coordinate match (within 0.5 degree)
  if (ra !== null && dec !== null) {
    const tolerance = 0.5;
    const target = await prisma.target.findFirst({
      where: {
        raDeg: { gte: ra - tolerance, lte: ra + tolerance },
        decDeg: { gte: dec - tolerance, lte: dec + tolerance },
        isDynamic: false,
      },
      orderBy: { magnitude: 'asc' },
    });

    if (target) {
      return { targetId: target.id, matchMethod: 'COORDINATES' };
    }
  }

  return null;
}

/**
 * Process a single image job
 */
async function processImageJob(job: Job<ProcessImageJobData>) {
  const { jobId, userId, storageKey, originalName } = job.data;
  let tempFilePath: string | null = null;

  console.log(`📸 Processing: ${originalName}`);

  try {
    // Mark job as processing immediately
    await prisma.imageProcessingJob.update({
      where: { id: jobId },
      data: {
        status: 'PROCESSING',
        updatedAt: new Date(),
      },
    });

    const ext = originalName.substring(originalName.lastIndexOf('.')).toLowerCase();

    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      throw new Error(`Unsupported file type: ${ext}. Only PNG/JPEG supported.`);
    }

    // Download image from MinIO
    const tempId = randomUUID();
    tempFilePath = join(tmpdir(), `${tempId}${ext}`);
    await downloadFileToPath(storageKey, tempFilePath);
    await job.updateProgress(10);

    const fileBuffer = await readFile(tempFilePath);
    console.log(`  ✓ Downloaded: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Update status to plate solving
    await prisma.imageProcessingJob.update({
      where: { id: jobId },
      data: {
        status: 'PLATE_SOLVING',
        updatedAt: new Date(),
      },
    });

    // Plate solve to get coordinates
    console.log(`  🔭 Plate solving...`);
    await job.updateProgress(20);

    let ra: number | null = null;
    let dec: number | null = null;

    try {
      const solveResult = await solveFieldWithFile(fileBuffer, originalName, {
        // Use higher downsample for large images to speed up solving
        downsampleFactor: fileBuffer.length > 10 * 1024 * 1024 ? 4 : 2,
      });

      if (solveResult.success && solveResult.calibration) {
        ra = solveResult.calibration.ra;
        dec = solveResult.calibration.dec;
        console.log(`  ✓ Plate solved: RA=${ra?.toFixed(4)}, Dec=${dec?.toFixed(4)}`);
      } else {
        console.log(`  ⚠ Plate solve failed: ${solveResult.error}`);
      }
    } catch (err) {
      console.warn(`  ⚠ Plate solve error:`, err instanceof Error ? err.message : err);
    }
    await job.updateProgress(60);

    // Match to target
    console.log(`  🎯 Matching target...`);
    const targetMatch = await findMatchingTarget(ra, dec);
    await job.updateProgress(75);

    if (!targetMatch) {
      // Update job as needing manual assignment
      await prisma.imageProcessingJob.update({
        where: { id: jobId },
        data: {
          status: 'NEEDS_TARGET',
          ra: ra ?? undefined,
          dec: dec ?? undefined,
          updatedAt: new Date(),
        },
      });

      console.log(`  ⚠ No target match found - needs manual assignment`);
      return { success: false, needsManualTarget: true };
    }

    console.log(`  ✓ Matched: ${targetMatch.targetId} (via ${targetMatch.matchMethod})`);

    // Fetch target details for display name
    const matchedTarget = await prisma.target.findUnique({
      where: { id: targetMatch.targetId },
      select: { name: true, catalogId: true },
    });
    const displayName = matchedTarget?.name || matchedTarget?.catalogId || 'Unknown Target';

    // Create ImageUpload record (use original storage key - already a displayable format)
    const imageUpload = await prisma.imageUpload.create({
      data: {
        userId,
        targetId: targetMatch.targetId,
        storageKey: storageKey,
        url: await getPresignedUrl(storageKey),
        visibility: 'PRIVATE',
        title: displayName,
      },
    });

    // Update UserTarget status
    await prisma.userTarget.updateMany({
      where: {
        userId,
        targetId: targetMatch.targetId,
        status: { in: ['WISHLIST', 'PLANNED'] },
      },
      data: {
        status: 'SHOT',
        lastShotAt: new Date(),
        timesShot: { increment: 1 },
      },
    });

    // Mark job completed
    await prisma.imageProcessingJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        targetId: targetMatch.targetId,
        targetMatch: targetMatch.matchMethod,
        imageUploadId: imageUpload.id,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await job.updateProgress(100);
    console.log(`✅ Done: ${imageUpload.id}`);

    return {
      success: true,
      imageUploadId: imageUpload.id,
      targetId: targetMatch.targetId,
    };

  } catch (error) {
    console.error(`❌ Error:`, error);

    await prisma.imageProcessingJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date(),
      },
    });

    throw error;
  } finally {
    // Cleanup temp file
    if (tempFilePath) {
      try { await unlink(tempFilePath); } catch { /* ignore */ }
    }
  }
}

/**
 * Create and start the worker
 */
export function createImageWorker() {
  const worker = new Worker(
    'image-processing',
    async (job) => {
      if (job.name === 'process-image') {
        return await processImageJob(job as Job<ProcessImageJobData>);
      }
      throw new Error(`Unknown job type: ${job.name}`);
    },
    {
      connection: redisConnection,
      concurrency: 2,
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed`);
  });

  worker.on('failed', (job, error) => {
    console.error(`❌ Job ${job?.id} failed:`, error.message);
  });

  console.log('👷 Image processing worker started (PNG/JPEG only)');

  return worker;
}

if (require.main === module) {
  createImageWorker();
}
