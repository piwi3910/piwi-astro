/**
 * Image Processing Worker
 * Processes uploaded astronomical images with unified FITS pipeline:
 * 1. Convert any format (XISF, RAW, TIFF, etc.) to FITS
 * 2. Extract metadata from FITS
 * 3. Plate solve if RA/Dec missing (via Astrometry.net)
 * 4. Match to target in database
 * 5. Create ImageUpload record
 *
 * Supported formats: FITS, XISF, CR2, CR3, NEF, ARW, DNG, RAF, ORF, RW2, PEF, SRW, TIFF, PNG, JPEG
 */
import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import redisConnection from '../redis';
import type { ProcessImageJobData } from '../queues';
import { downloadFileToPath, getPresignedUrl } from '../../minio';
import { solveFieldWithFile } from '../../astrometry/client';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

// Path to Python in venv (falls back to system python3 if venv doesn't exist)
const PYTHON_PATH = join(process.cwd(), 'venv', 'bin', 'python3');

// Processing status constants
const STATUS = {
  PENDING: 'PENDING',
  CONVERTING: 'CONVERTING',
  EXTRACTING: 'EXTRACTING',
  PLATE_SOLVING: 'PLATE_SOLVING',
  MATCHING: 'MATCHING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

// Supported file extensions
const FITS_EXTENSIONS = new Set(['.fits', '.fit', '.fts']);
const SUPPORTED_EXTENSIONS = new Set([
  ...FITS_EXTENSIONS,
  '.xisf',
  '.tiff', '.tif',
  '.cr2', '.cr3', '.nef', '.arw', '.dng', '.raf', '.orf', '.rw2', '.pef', '.srw',
  '.png', '.jpg', '.jpeg',
]);

interface ConversionResult {
  success: boolean;
  error?: string;
  output_path?: string;
  original_format?: string;
  method?: string;
  copied?: boolean;
}

interface ExtractedMetadata {
  success: boolean;
  error?: string;
  fileType?: string;
  targetName?: string;
  ra?: number;
  dec?: number;
  raStr?: string;
  decStr?: string;
  exposureTime?: number;
  exposureCount?: number;
  totalIntegrationTime?: number;
  captureDate?: string;
  filter?: string;
  gain?: number;
  iso?: number;
  temperature?: number;
  telescope?: string;
  camera?: string;
  focalLength?: number;
  pixelSizeX?: number;
  pixelSizeY?: number;
  width?: number;
  height?: number;
  binningX?: number;
  binningY?: number;
  software?: string;
  observer?: string;
  siteLatitude?: number;
  siteLongitude?: number;
}

/**
 * Update the processing job status in the database
 */
async function updateJobStatus(
  jobId: string,
  status: string,
  data?: Partial<{
    errorMessage: string;
    errorDetails: string;
    extractedMetadata: object;
    targetId: string;
    targetMatch: string;
    targetName: string;
    ra: number;
    dec: number;
    exposureTime: number;
    totalIntegration: number;
    filter: string;
    captureDate: Date;
    completedAt: Date;
    imageUploadId: string;
  }>
) {
  await prisma.imageProcessingJob.update({
    where: { id: jobId },
    data: {
      status,
      ...data,
      updatedAt: new Date(),
    },
  });
}

/**
 * Convert any supported format to FITS using Python script
 */
async function convertToFits(inputPath: string, outputPath: string): Promise<ConversionResult> {
  const scriptPath = join(process.cwd(), 'scripts', 'convert_to_fits.py');

  try {
    const { stdout, stderr } = await execAsync(
      `"${PYTHON_PATH}" "${scriptPath}" "${inputPath}" "${outputPath}"`,
      { timeout: 300000 } // 5 minute timeout for large files
    );

    if (stderr) {
      console.warn('Conversion script stderr:', stderr);
    }

    return JSON.parse(stdout) as ConversionResult;
  } catch (error) {
    console.error('Error executing conversion script:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to convert file',
    };
  }
}

/**
 * Extract metadata from FITS file using Python script
 */
async function extractMetadata(filePath: string): Promise<ExtractedMetadata> {
  const scriptPath = join(process.cwd(), 'scripts', 'extract_fits_metadata.py');

  try {
    const { stdout, stderr } = await execAsync(`"${PYTHON_PATH}" "${scriptPath}" "${filePath}"`);

    if (stderr) {
      console.warn('Python script stderr:', stderr);
    }

    return JSON.parse(stdout) as ExtractedMetadata;
  } catch (error) {
    console.error('Error executing Python script:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract metadata',
    };
  }
}

/**
 * Parse RA string (HH:MM:SS or decimal) to degrees
 */
function parseRA(raStr: string): number | null {
  // Try decimal first
  const decimal = parseFloat(raStr);
  if (!isNaN(decimal)) return decimal;

  // Try HH:MM:SS format
  const match = raStr.match(/(\d+)[h:\s]+(\d+)[m:\s]+(\d+\.?\d*)/i);
  if (match) {
    const hours = parseFloat(match[1]);
    const minutes = parseFloat(match[2]);
    const seconds = parseFloat(match[3]);
    return (hours + minutes / 60 + seconds / 3600) * 15; // Convert hours to degrees
  }

  return null;
}

/**
 * Parse Dec string (+/-DD:MM:SS or decimal) to degrees
 */
function parseDec(decStr: string): number | null {
  // Try decimal first
  const decimal = parseFloat(decStr);
  if (!isNaN(decimal)) return decimal;

  // Try DD:MM:SS format
  const match = decStr.match(/([+-]?\d+)[d°:\s]+(\d+)[m':\s]+(\d+\.?\d*)/i);
  if (match) {
    const degrees = parseFloat(match[1]);
    const minutes = parseFloat(match[2]);
    const seconds = parseFloat(match[3]);
    const sign = degrees < 0 ? -1 : 1;
    return degrees + sign * (minutes / 60 + seconds / 3600);
  }

  return null;
}

/**
 * Find a matching target in the database
 */
async function findMatchingTarget(
  targetName: string | null,
  ra: number | null,
  dec: number | null
): Promise<{ targetId: string; matchMethod: string } | null> {
  // First try to match by name
  if (targetName) {
    // Clean up target name - remove common prefixes/suffixes
    const cleanName = targetName.trim();

    // Try exact match on catalogId
    let target = await prisma.target.findFirst({
      where: {
        OR: [
          { catalogId: cleanName },
          { name: { equals: cleanName, mode: 'insensitive' } },
          { messierId: cleanName },
          { ngcId: cleanName },
          { icId: cleanName },
          { caldwellId: cleanName },
        ],
      },
    });

    if (target) {
      return { targetId: target.id, matchMethod: 'METADATA' };
    }

    // Try partial match
    target = await prisma.target.findFirst({
      where: {
        OR: [
          { catalogId: { contains: cleanName, mode: 'insensitive' } },
          { name: { contains: cleanName, mode: 'insensitive' } },
          { otherNames: { contains: cleanName, mode: 'insensitive' } },
        ],
      },
    });

    if (target) {
      return { targetId: target.id, matchMethod: 'METADATA' };
    }
  }

  // Then try to match by coordinates (within ~0.5 degree tolerance)
  if (ra !== null && dec !== null) {
    const tolerance = 0.5; // degrees
    const target = await prisma.target.findFirst({
      where: {
        raDeg: { gte: ra - tolerance, lte: ra + tolerance },
        decDeg: { gte: dec - tolerance, lte: dec + tolerance },
        isDynamic: false, // Don't match dynamic objects by coordinates
      },
      orderBy: [
        // Prefer brighter objects
        { magnitude: 'asc' },
      ],
    });

    if (target) {
      return { targetId: target.id, matchMethod: 'PLATE_SOLVE' };
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
  let fitsFilePath: string | null = null;

  console.log(`📸 [Job ${job.id}] Processing image: ${originalName}`);

  try {
    // Get file extension
    const ext = originalName.substring(originalName.lastIndexOf('.')).toLowerCase();

    // Validate file extension
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      throw new Error(`Unsupported file type: ${ext}. Supported: ${[...SUPPORTED_EXTENSIONS].join(', ')}`);
    }

    // Download file from MinIO to temp location
    const tempId = randomUUID();
    tempFilePath = join(tmpdir(), `${tempId}${ext}`);
    await downloadFileToPath(storageKey, tempFilePath);
    await job.updateProgress(10);

    // Check if conversion is needed
    const needsConversion = !FITS_EXTENSIONS.has(ext);

    if (needsConversion) {
      // Update status to CONVERTING
      await updateJobStatus(jobId, STATUS.CONVERTING);
      console.log(`  🔄 Converting ${ext.toUpperCase()} to FITS...`);

      fitsFilePath = join(tmpdir(), `${tempId}.fits`);
      const conversionResult = await convertToFits(tempFilePath, fitsFilePath);
      await job.updateProgress(25);

      if (!conversionResult.success) {
        throw new Error(conversionResult.error || 'Failed to convert file to FITS');
      }

      console.log(`  ✓ Converted from ${conversionResult.original_format} (method: ${conversionResult.method || 'default'})`);
    } else {
      // Already FITS, use original file
      fitsFilePath = tempFilePath;
      tempFilePath = null; // Don't delete the FITS file yet
    }

    // Update status to EXTRACTING
    await updateJobStatus(jobId, STATUS.EXTRACTING);
    await job.updateProgress(30);

    // Extract metadata from FITS file
    console.log(`  📋 Extracting metadata from FITS...`);
    const metadata = await extractMetadata(fitsFilePath);
    await job.updateProgress(45);

    if (!metadata.success) {
      throw new Error(metadata.error || 'Failed to extract metadata');
    }

    // Parse coordinates
    let ra: number | null = metadata.ra ?? null;
    let dec: number | null = metadata.dec ?? null;

    // Try parsing string coordinates if numeric not available
    if (ra === null && metadata.raStr) {
      ra = parseRA(metadata.raStr);
    }
    if (dec === null && metadata.decStr) {
      dec = parseDec(metadata.decStr);
    }

    // Parse capture date
    let captureDate: Date | null = null;
    if (metadata.captureDate) {
      captureDate = new Date(metadata.captureDate);
      if (isNaN(captureDate.getTime())) {
        captureDate = null;
      }
    }

    // Calculate total integration time
    let totalIntegration = metadata.totalIntegrationTime ?? null;
    if (
      totalIntegration === null &&
      metadata.exposureTime &&
      metadata.exposureCount
    ) {
      totalIntegration = metadata.exposureTime * metadata.exposureCount;
    }

    // Update job with extracted metadata
    await updateJobStatus(jobId, STATUS.EXTRACTING, {
      extractedMetadata: metadata,
      targetName: metadata.targetName,
      ra: ra ?? undefined,
      dec: dec ?? undefined,
      exposureTime: metadata.exposureTime,
      totalIntegration: totalIntegration
        ? totalIntegration / 60
        : undefined, // Convert to minutes
      filter: metadata.filter,
      captureDate: captureDate ?? undefined,
    });

    await job.updateProgress(50);

    // If no coordinates, try plate solving
    if (ra === null || dec === null) {
      console.log(`  🔭 No coordinates found, attempting plate solve...`);
      await updateJobStatus(jobId, STATUS.PLATE_SOLVING);
      await job.updateProgress(55);

      try {
        // Read the FITS file as a buffer for direct upload to Astrometry.net
        const { readFile } = await import('fs/promises');
        const fileBuffer = await readFile(fitsFilePath);
        const fileName = `${randomUUID()}.fits`;
        console.log(`  🔭 Plate solving via file upload (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)...`);

        const plateSolveResult = await solveFieldWithFile(fileBuffer, fileName, {
          scaleUnits: 'degwidth',
          scaleType: 'ul',
          scaleLower: 0.1,
          scaleUpper: 180,
        });

        if (plateSolveResult.success && plateSolveResult.calibration) {
          ra = plateSolveResult.calibration.ra;
          dec = plateSolveResult.calibration.dec;
          console.log(`  ✓ Plate solve successful: RA=${ra}, Dec=${dec}`);

          // Update metadata with plate solve results
          await updateJobStatus(jobId, STATUS.PLATE_SOLVING, {
            ra,
            dec,
            extractedMetadata: {
              ...metadata,
              plateSolve: plateSolveResult.calibration,
            },
          });
        } else {
          console.log(`  ⚠ Plate solve failed: ${plateSolveResult.error}`);
        }
      } catch (plateSolveError) {
        console.warn(
          '  ⚠ Plate solving error:',
          plateSolveError instanceof Error
            ? plateSolveError.message
            : plateSolveError
        );
        // Continue without plate solve - we can still process the image
      }
    }

    await job.updateProgress(70);

    // Try to find matching target
    console.log(`  🎯 Matching target...`);
    await updateJobStatus(jobId, STATUS.MATCHING);

    const targetMatch = await findMatchingTarget(
      metadata.targetName ?? null,
      ra,
      dec
    );

    await job.updateProgress(80);

    if (targetMatch) {
      console.log(
        `  ✓ Found target: ${targetMatch.targetId} (via ${targetMatch.matchMethod})`
      );

      // Create ImageUpload record
      const imageUpload = await prisma.imageUpload.create({
        data: {
          userId,
          targetId: targetMatch.targetId,
          storageKey,
          url: await getPresignedUrl(storageKey),
          visibility: 'PRIVATE',
          title: metadata.targetName ?? originalName,
          exposureTimeSec: metadata.exposureTime ?? null,
          totalIntegrationMin: totalIntegration
            ? totalIntegration / 60
            : null,
          filter: metadata.filter ?? null,
          isoGain:
            metadata.gain?.toString() ?? metadata.iso?.toString() ?? null,
        },
      });

      // Update UserTarget status if exists
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

      // Mark job as completed
      await updateJobStatus(jobId, STATUS.COMPLETED, {
        targetId: targetMatch.targetId,
        targetMatch: targetMatch.matchMethod,
        imageUploadId: imageUpload.id,
        completedAt: new Date(),
      });

      await job.updateProgress(100);
      console.log(`✅ [Job ${job.id}] Image processed successfully`);

      return {
        success: true,
        imageUploadId: imageUpload.id,
        targetId: targetMatch.targetId,
        matchMethod: targetMatch.matchMethod,
      };
    } else {
      // No target found - mark as failed with specific error
      const errorMsg = 'Could not match image to any known target';
      console.log(`  ⚠ ${errorMsg}`);

      await updateJobStatus(jobId, STATUS.FAILED, {
        errorMessage: errorMsg,
        errorDetails: JSON.stringify({
          extractedTargetName: metadata.targetName,
          extractedRA: ra,
          extractedDec: dec,
          suggestion:
            'Please manually assign a target or add the target to the catalog first',
        }),
      });

      return {
        success: false,
        error: errorMsg,
        needsManualTarget: true,
      };
    }
  } catch (error) {
    console.error(`❌ [Job ${job.id}] Error processing image:`, error);

    await updateJobStatus(jobId, STATUS.FAILED, {
      errorMessage:
        error instanceof Error ? error.message : 'Unknown error occurred',
      errorDetails: JSON.stringify({
        stack: error instanceof Error ? error.stack : undefined,
      }),
    });

    throw error;
  } finally {
    // Clean up temp files
    const filesToClean = [tempFilePath, fitsFilePath].filter(
      (f): f is string => f !== null
    );
    // Remove duplicates (if fitsFilePath === tempFilePath for native FITS)
    const uniqueFiles = [...new Set(filesToClean)];

    for (const filePath of uniqueFiles) {
      try {
        await unlink(filePath);
      } catch (cleanupError) {
        // Ignore errors for already deleted files
        if ((cleanupError as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.warn('Error cleaning up temp file:', cleanupError);
        }
      }
    }
  }
}

/**
 * Create and start the image processing worker
 */
export function createImageWorker() {
  const worker = new Worker(
    'image-processing',
    async (job) => {
      console.log(`\n🚀 Processing job: ${job.name} (ID: ${job.id})`);

      switch (job.name) {
        case 'process-image':
          return await processImageJob(job as Job<ProcessImageJobData>);

        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    },
    {
      connection: redisConnection,
      concurrency: 2, // Process 2 images at a time
    }
  );

  worker.on('completed', (job, result) => {
    console.log(`✅ Job ${job.id} completed:`, result);
  });

  worker.on('failed', (job, error) => {
    console.error(`❌ Job ${job?.id} failed:`, error.message);
  });

  worker.on('error', (error) => {
    console.error('❌ Worker error:', error);
  });

  console.log('👷 Image processing worker started');

  return worker;
}

// Start worker if this file is run directly
if (require.main === module) {
  createImageWorker();
  console.log('Image processing worker is running. Press Ctrl+C to stop.');
}
