/**
 * Target Image Utilities
 * Fetch target images from astronomical databases
 */

export interface TargetImageSource {
  name: string;
  url: string;
  credit: string;
}

/**
 * Get DSS (Digitized Sky Survey) image URL for a target
 * @param raDeg Right Ascension in degrees
 * @param decDeg Declination in degrees
 * @param sizeDeg Field of view size in degrees (default 0.5)
 * @param format Image format (default 'jpg')
 */
export function getDSSImageUrl(
  raDeg: number,
  decDeg: number,
  sizeDeg: number = 0.5,
  format: 'jpg' | 'gif' = 'jpg'
): string {
  const baseUrl = 'https://archive.stsci.edu/cgi-bin/dss_search';
  const params = new URLSearchParams({
    v: 'poss2ukstu_red', // Survey version
    r: raDeg.toFixed(6),
    d: decDeg.toFixed(6),
    e: 'J2000',
    h: sizeDeg.toFixed(3),
    w: sizeDeg.toFixed(3),
    f: format,
    c: 'none',
    fov: 'NONE',
    v3: '',
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Get NASA SkyView image URL for a target
 * @param raDeg Right Ascension in degrees
 * @param decDeg Declination in degrees
 * @param sizeDeg Field of view size in degrees (default 0.5)
 * @param survey Survey to use (default 'DSS')
 */
export function getSkyViewImageUrl(
  raDeg: number,
  decDeg: number,
  sizeDeg: number = 0.5,
  survey: string = 'DSS'
): string {
  const baseUrl = 'https://skyview.gsfc.nasa.gov/current/cgi/runquery.pl';
  const params = new URLSearchParams({
    Position: `${raDeg},${decDeg}`,
    survey: survey,
    coordinates: 'J2000',
    projection: 'Tan',
    pixels: '500',
    size: sizeDeg.toFixed(3),
    float: 'on',
    scaling: 'Linear',
    resolver: 'SIMBAD-NED',
    Sampler: 'LI',
    return: 'JPEG',
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Get Aladin Lite image URL for embedding
 * @param raDeg Right Ascension in degrees
 * @param decDeg Declination in degrees
 * @param fov Field of view in degrees (default 0.5)
 */
export function getAladinImageUrl(
  raDeg: number,
  decDeg: number,
  fov: number = 0.5
): string {
  return `https://aladin.cds.unistra.fr/AladinLite/?target=${raDeg}+${decDeg}&fov=${fov}&survey=P%2FDSS2%2Fcolor`;
}

/**
 * Get target image with fallback sources
 * Tries multiple sources in order until one succeeds
 */
export async function getTargetImage(
  raDeg: number,
  decDeg: number,
  sizeDeg: number = 0.5
): Promise<TargetImageSource> {
  // Try DSS first (most reliable)
  const dssUrl = getDSSImageUrl(raDeg, decDeg, sizeDeg);

  try {
    const response = await fetch(dssUrl, { method: 'HEAD' });
    if (response.ok) {
      return {
        name: 'DSS (Digitized Sky Survey)',
        url: dssUrl,
        credit: 'STScI Digitized Sky Survey',
      };
    }
  } catch (error) {
    console.error('DSS image fetch failed:', error);
  }

  // Fallback to SkyView
  const skyViewUrl = getSkyViewImageUrl(raDeg, decDeg, sizeDeg);
  return {
    name: 'NASA SkyView',
    url: skyViewUrl,
    credit: 'NASA SkyView Virtual Observatory',
  };
}

/**
 * Calculate appropriate field of view based on target size
 * @param sizeMajorArcmin Major axis size in arcminutes
 * @param sizeMinorArcmin Minor axis size in arcminutes
 */
export function calculateFOV(
  sizeMajorArcmin?: number | null,
  _sizeMinorArcmin?: number | null
): number {
  if (!sizeMajorArcmin) {
    return 0.5; // Default 30 arcmin
  }

  // Add 50% padding around the target
  const targetSizeDeg = (sizeMajorArcmin / 60) * 1.5;

  // Clamp between 0.1 and 2 degrees
  return Math.max(0.1, Math.min(2, targetSizeDeg));
}

/**
 * Get professional astrophotography image URL if available
 * This would connect to your own database or external APIs
 */
export async function getProfessionalImage(_catalogId: string): Promise<string | null> {
  // TODO: Implement connection to professional image database
  // Examples: ESO, NASA, Hubble, etc.
  // For now, return null and fall back to survey images
  return null;
}
