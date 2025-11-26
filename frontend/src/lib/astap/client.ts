/**
 * ASTAP Plate Solver Client
 * Uses a local ASTAP solver running in Docker with a job queue system.
 *
 * API endpoints:
 *   POST /solve - Submit image for plate solving (returns job_id)
 *   GET /job/<job_id> - Poll for job status and results
 *   GET /queue - Get queue status
 */

const ASTAP_URL = process.env.ASTAP_URL || 'http://localhost:8082';

// Polling configuration
const POLL_INTERVAL_MS = 2000; // 2 seconds between polls
const MAX_POLL_ATTEMPTS = 150; // 5 minutes max wait time (150 * 2s)

// Upload timeout (2 minutes for file upload)
const UPLOAD_TIMEOUT_MS = 120000;

export interface PlateSolveOptions {
  // FOV hint in degrees
  fov?: number;

  // Center hint (degrees)
  centerRa?: number;
  centerDec?: number;

  // Downsample factor (1-4)
  downsampleFactor?: number;
}

export interface CalibrationResult {
  ra: number; // Right ascension of center (degrees)
  dec: number; // Declination of center (degrees)
  orientation: number; // Position angle (degrees E of N)
  pixscale: number; // Pixel scale (arcsec/pixel)
  width: number; // Width of image (degrees)
  height: number; // Height of image (degrees)
}

export interface PlateSolveResult {
  success: boolean;
  error?: string;
  jobId?: string;
  calibration?: CalibrationResult;
}

export interface QueueStatus {
  queued: number;
  processing: number;
  processingJobs: string[];
  maxConcurrent: number;
}

interface JobSubmitResponse {
  success: boolean;
  job_id?: string;
  status?: string;
  queue_position?: number;
  message?: string;
  error?: string;
}

interface JobStatusResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  filename?: string;
  queue_position?: number;
  // Result fields (when completed)
  success?: boolean;
  solved?: boolean;
  ra?: number;
  dec?: number;
  orientation?: number;
  pixscale?: number;
  fieldw?: number;
  fieldh?: number;
  wcs?: Record<string, unknown>;
  error?: string;
}

/**
 * Submit an image for plate solving and poll for results
 */
export async function solveFieldWithFile(
  fileBuffer: Buffer,
  fileName: string,
  options: PlateSolveOptions = {}
): Promise<PlateSolveResult> {
  try {
    console.log(`  🔭 Submitting to ASTAP solver at ${ASTAP_URL}...`);

    // Create form data with the image
    const formData = new FormData();

    // Convert Buffer to Blob
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.length
    ) as ArrayBuffer;
    formData.append('file', new Blob([arrayBuffer]), fileName);

    // Add FOV hint if provided
    if (options.fov !== undefined) {
      formData.append('fov', options.fov.toString());
    }

    // Add center hints if provided
    if (options.centerRa !== undefined) {
      formData.append('ra', options.centerRa.toString());
    }
    if (options.centerDec !== undefined) {
      formData.append('dec', options.centerDec.toString());
    }

    // Add downsample factor
    if (options.downsampleFactor !== undefined) {
      formData.append('downsample', options.downsampleFactor.toString());
    }

    // Submit the job
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

    let submitResponse: Response;
    try {
      submitResponse = await fetch(`${ASTAP_URL}/solve`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Upload timed out after ${UPLOAD_TIMEOUT_MS / 1000} seconds`);
      }
      throw error;
    }

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      throw new Error(`ASTAP solver returned ${submitResponse.status}: ${errorText}`);
    }

    const submitResult: JobSubmitResponse = await submitResponse.json();
    console.log(`  📡 Job submitted:`, submitResult);

    if (!submitResult.success || !submitResult.job_id) {
      return {
        success: false,
        error: submitResult.error || 'Failed to submit job',
      };
    }

    const jobId = submitResult.job_id;
    console.log(`  ⏳ Job ${jobId} queued at position ${submitResult.queue_position}. Polling for results...`);

    // Poll for results
    let attempts = 0;
    while (attempts < MAX_POLL_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      attempts++;

      try {
        const statusResponse = await fetch(`${ASTAP_URL}/job/${jobId}`);

        if (!statusResponse.ok) {
          if (statusResponse.status === 404) {
            return {
              success: false,
              error: 'Job not found or expired',
              jobId,
            };
          }
          continue; // Retry on other errors
        }

        const status: JobStatusResponse = await statusResponse.json();

        if (status.status === 'queued') {
          console.log(`  ⏳ Job queued at position ${status.queue_position}...`);
          continue;
        }

        if (status.status === 'processing') {
          console.log(`  🔄 Job processing...`);
          continue;
        }

        if (status.status === 'completed') {
          console.log(`  ✅ Job completed!`);

          if (status.solved) {
            const calibration: CalibrationResult = {
              ra: status.ra ?? 0,
              dec: status.dec ?? 0,
              orientation: status.orientation ?? 0,
              pixscale: status.pixscale ?? 0,
              width: status.fieldw ?? 0,
              height: status.fieldh ?? 0,
            };

            return {
              success: true,
              jobId,
              calibration,
            };
          } else {
            return {
              success: false,
              error: status.error || 'No solution found',
              jobId,
            };
          }
        }

        if (status.status === 'failed') {
          return {
            success: false,
            error: status.error || 'Job failed',
            jobId,
          };
        }

        if (status.status === 'cancelled') {
          return {
            success: false,
            error: 'Job was cancelled',
            jobId,
          };
        }
      } catch (pollError) {
        console.error(`  ⚠️ Poll error (attempt ${attempts}):`, pollError);
        // Continue polling on transient errors
      }
    }

    // Timeout after max attempts
    return {
      success: false,
      error: `Plate solve timed out after ${(MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000} seconds`,
      jobId,
    };
  } catch (error) {
    console.error('  ❌ Plate solve error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Check if the ASTAP solver is available
 */
export async function isAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${ASTAP_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;

    const data = await response.json();
    return data.status === 'healthy';
  } catch {
    return false;
  }
}

/**
 * Get queue status
 */
export async function getQueueStatus(): Promise<QueueStatus | null> {
  try {
    const response = await fetch(`${ASTAP_URL}/queue`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      queued: data.queued,
      processing: data.processing,
      processingJobs: data.processing_jobs || [],
      maxConcurrent: data.max_concurrent,
    };
  } catch {
    return null;
  }
}

/**
 * Cancel a queued job
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  try {
    const response = await fetch(`${ASTAP_URL}/job/${jobId}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
