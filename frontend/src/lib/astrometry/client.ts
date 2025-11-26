/**
 * Astrometry.net API Client
 * Used for plate solving astronomical images to determine their coordinates
 *
 * API Documentation: http://nova.astrometry.net/api_help
 */

const ASTROMETRY_API_URL =
  process.env.ASTROMETRY_API_URL || 'http://nova.astrometry.net/api';
const ASTROMETRY_API_KEY = process.env.ASTROMETRY_API_KEY;

// Polling configuration
const POLL_INTERVAL_MS = 5000; // 5 seconds
const MAX_POLL_ATTEMPTS = 120; // 10 minutes max wait time

// Upload timeout (5 minutes for large files)
const UPLOAD_TIMEOUT_MS = 300000;

export interface PlateSolveOptions {
  // Scale parameters
  scaleUnits?: 'degwidth' | 'arcminwidth' | 'arcsecperpix';
  scaleType?: 'ul' | 'ev'; // ul = upper/lower bounds, ev = estimate/error
  scaleLower?: number;
  scaleUpper?: number;
  scaleEst?: number;
  scaleErr?: number;

  // Center hint (degrees)
  centerRa?: number;
  centerDec?: number;
  radius?: number; // Search radius in degrees

  // Other options
  downsampleFactor?: number;
  tweakOrder?: number;
  crpixCenter?: boolean;
}

export interface CalibrationResult {
  ra: number; // Right ascension of center (degrees)
  dec: number; // Declination of center (degrees)
  orientation: number; // Position angle (degrees E of N)
  pixscale: number; // Pixel scale (arcsec/pixel)
  radius: number; // Radius of image (degrees)
  width: number; // Width of image (degrees)
  height: number; // Height of image (degrees)
}

export interface PlateSolveResult {
  success: boolean;
  error?: string;
  submissionId?: number;
  jobId?: number;
  calibration?: CalibrationResult;
  objects?: string[]; // Objects in field
}

interface AstrometrySession {
  sessionKey: string;
  expiresAt: Date;
}

let cachedSession: AstrometrySession | null = null;

/**
 * Login to Astrometry.net and get a session key
 */
async function login(): Promise<string> {
  // Check if we have a valid cached session
  if (cachedSession && cachedSession.expiresAt > new Date()) {
    return cachedSession.sessionKey;
  }

  if (!ASTROMETRY_API_KEY) {
    throw new Error(
      'ASTROMETRY_API_KEY environment variable is not set. ' +
        'Get an API key from http://nova.astrometry.net/api_help'
    );
  }

  const response = await fetch(`${ASTROMETRY_API_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `request-json=${encodeURIComponent(
      JSON.stringify({ apikey: ASTROMETRY_API_KEY })
    )}`,
  });

  const data = await response.json();

  if (data.status !== 'success') {
    throw new Error(`Astrometry.net login failed: ${data.errormessage || 'Unknown error'}`);
  }

  // Cache the session (sessions last ~1 hour, we'll refresh after 50 minutes)
  cachedSession = {
    sessionKey: data.session,
    expiresAt: new Date(Date.now() + 50 * 60 * 1000),
  };

  return data.session;
}

/**
 * Build request data with common options
 */
function buildRequestData(
  sessionKey: string,
  options: PlateSolveOptions = {}
): Record<string, unknown> {
  const requestData: Record<string, unknown> = {
    session: sessionKey,
    allow_commercial_use: 'n',
    allow_modifications: 'n',
    publicly_visible: 'n',
  };

  // Add scale parameters
  if (options.scaleUnits) {
    requestData.scale_units = options.scaleUnits;
  }
  if (options.scaleType) {
    requestData.scale_type = options.scaleType;
  }
  if (options.scaleLower !== undefined) {
    requestData.scale_lower = options.scaleLower;
  }
  if (options.scaleUpper !== undefined) {
    requestData.scale_upper = options.scaleUpper;
  }
  if (options.scaleEst !== undefined) {
    requestData.scale_est = options.scaleEst;
  }
  if (options.scaleErr !== undefined) {
    requestData.scale_err = options.scaleErr;
  }

  // Add center hint
  if (options.centerRa !== undefined) {
    requestData.center_ra = options.centerRa;
  }
  if (options.centerDec !== undefined) {
    requestData.center_dec = options.centerDec;
  }
  if (options.radius !== undefined) {
    requestData.radius = options.radius;
  }

  // Other options
  if (options.downsampleFactor !== undefined) {
    requestData.downsample_factor = options.downsampleFactor;
  }
  if (options.tweakOrder !== undefined) {
    requestData.tweak_order = options.tweakOrder;
  }
  if (options.crpixCenter !== undefined) {
    requestData.crpix_center = options.crpixCenter;
  }

  return requestData;
}

/**
 * Submit a file directly for plate solving (preferred method)
 */
async function submitFile(
  sessionKey: string,
  fileBuffer: Buffer,
  fileName: string,
  options: PlateSolveOptions = {}
): Promise<number> {
  const requestData = buildRequestData(sessionKey, options);

  // Create multipart form data
  // Convert Buffer to ArrayBuffer for Blob compatibility
  const arrayBuffer = fileBuffer.buffer.slice(
    fileBuffer.byteOffset,
    fileBuffer.byteOffset + fileBuffer.length
  ) as ArrayBuffer;
  const formData = new FormData();
  formData.append('request-json', JSON.stringify(requestData));
  formData.append('file', new Blob([arrayBuffer]), fileName);

  // Use AbortController for timeout on large uploads
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(`${ASTROMETRY_API_URL}/upload`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json();

    if (data.status !== 'success') {
      throw new Error(
        `Astrometry.net file upload failed: ${data.errormessage || 'Unknown error'}`
      );
    }

    return data.subid;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`File upload timed out after ${UPLOAD_TIMEOUT_MS / 1000} seconds`);
    }
    throw error;
  }
}

/**
 * Submit a URL for plate solving (fallback method - requires publicly accessible URL)
 */
async function submitUrl(
  sessionKey: string,
  imageUrl: string,
  options: PlateSolveOptions = {}
): Promise<number> {
  const requestData = buildRequestData(sessionKey, options);
  requestData.url = imageUrl;

  const response = await fetch(`${ASTROMETRY_API_URL}/url_upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `request-json=${encodeURIComponent(JSON.stringify(requestData))}`,
  });

  const data = await response.json();

  if (data.status !== 'success') {
    throw new Error(
      `Astrometry.net submission failed: ${data.errormessage || 'Unknown error'}`
    );
  }

  return data.subid;
}

/**
 * Get submission status and job IDs
 */
async function getSubmissionStatus(
  submissionId: number
): Promise<{ processing: boolean; jobIds: number[] }> {
  const response = await fetch(
    `${ASTROMETRY_API_URL}/submissions/${submissionId}`
  );
  const data = await response.json();

  return {
    processing:
      data.processing_started !== null && data.processing_finished === null,
    jobIds: data.jobs || [],
  };
}

/**
 * Get job status
 */
async function getJobStatus(
  jobId: number
): Promise<'solving' | 'success' | 'failure'> {
  const response = await fetch(`${ASTROMETRY_API_URL}/jobs/${jobId}`);
  const data = await response.json();
  return data.status;
}

/**
 * Get calibration results for a solved job
 */
async function getCalibration(jobId: number): Promise<CalibrationResult> {
  const response = await fetch(
    `${ASTROMETRY_API_URL}/jobs/${jobId}/calibration`
  );
  const data = await response.json();

  return {
    ra: data.ra,
    dec: data.dec,
    orientation: data.orientation,
    pixscale: data.pixscale,
    radius: data.radius,
    width: data.width_arcsec / 3600,
    height: data.height_arcsec / 3600,
  };
}

/**
 * Get objects in field for a solved job
 */
async function getObjectsInField(jobId: number): Promise<string[]> {
  const response = await fetch(
    `${ASTROMETRY_API_URL}/jobs/${jobId}/objects_in_field`
  );
  const data = await response.json();
  return data.objects_in_field || [];
}

/**
 * Wait for job to complete with polling
 */
async function waitForJob(
  submissionId: number
): Promise<{ jobId: number; success: boolean }> {
  let attempts = 0;

  while (attempts < MAX_POLL_ATTEMPTS) {
    attempts++;

    // Check submission status
    const submission = await getSubmissionStatus(submissionId);

    // Check if we have any jobs
    if (submission.jobIds.length > 0) {
      for (const jobId of submission.jobIds) {
        if (jobId === null) continue;

        const status = await getJobStatus(jobId);

        if (status === 'success') {
          return { jobId, success: true };
        } else if (status === 'failure') {
          return { jobId, success: false };
        }
        // status === 'solving' means still processing
      }
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error('Plate solving timed out');
}

/**
 * Solve an image field using file upload (preferred method)
 * This uploads the file directly to Astrometry.net, avoiding URL accessibility issues
 */
export async function solveFieldWithFile(
  fileBuffer: Buffer,
  fileName: string,
  options: PlateSolveOptions = {}
): Promise<PlateSolveResult> {
  try {
    // Login and get session
    const sessionKey = await login();

    // Submit file for solving
    const submissionId = await submitFile(sessionKey, fileBuffer, fileName, options);
    console.log(`  📤 Uploaded to Astrometry.net (submission ID: ${submissionId})`);

    // Wait for job to complete
    const { jobId, success } = await waitForJob(submissionId);

    if (!success) {
      return {
        success: false,
        error: 'Plate solving failed - no solution found',
        submissionId,
        jobId,
      };
    }

    // Get calibration and objects
    const [calibration, objects] = await Promise.all([
      getCalibration(jobId),
      getObjectsInField(jobId),
    ]);

    return {
      success: true,
      submissionId,
      jobId,
      calibration,
      objects,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Solve an image field using URL (requires publicly accessible URL)
 * @deprecated Use solveFieldWithFile for local/private files
 */
export async function solveField(
  imageUrl: string,
  options: PlateSolveOptions = {}
): Promise<PlateSolveResult> {
  try {
    // Login and get session
    const sessionKey = await login();

    // Submit URL for solving
    const submissionId = await submitUrl(sessionKey, imageUrl, options);
    console.log(`  📤 Submitted to Astrometry.net (submission ID: ${submissionId})`);

    // Wait for job to complete
    const { jobId, success } = await waitForJob(submissionId);

    if (!success) {
      return {
        success: false,
        error: 'Plate solving failed - no solution found',
        submissionId,
        jobId,
      };
    }

    // Get calibration and objects
    const [calibration, objects] = await Promise.all([
      getCalibration(jobId),
      getObjectsInField(jobId),
    ]);

    return {
      success: true,
      submissionId,
      jobId,
      calibration,
      objects,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Check if Astrometry.net API is configured
 */
export function isConfigured(): boolean {
  return !!ASTROMETRY_API_KEY;
}
