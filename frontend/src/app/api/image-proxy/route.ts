import { NextRequest, NextResponse } from 'next/server';
import { cacheExternalImage } from '@/lib/image-cache';

/**
 * Whitelist of trusted domains for SSRF protection
 * Only images from these domains can be proxied
 */
const ALLOWED_DOMAINS = [
  'alasky.u-strasbg.fr',       // Aladin HiPS2FITS astronomical survey images
  'upload.wikimedia.org',       // Wikimedia Commons (planet images)
  'archive.stsci.edu',          // Space Telescope Science Institute (DSS)
  'skyview.gsfc.nasa.gov',      // NASA SkyView
  'cdnjs.cloudflare.com',       // CDN for Leaflet map icons
  'djlorenz.github.io',         // Light pollution map tiles
  'placehold.co',               // Placeholder images (development)
];

/**
 * Image Proxy API
 * Caches external images in MinIO and redirects to cached URL
 * Usage: /api/image-proxy?url=https://example.com/image.jpg
 *
 * Security: Only whitelisted domains are allowed to prevent SSRF attacks
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const externalUrl = searchParams.get('url');

    if (!externalUrl) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 }
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(externalUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      );
    }

    // Security: Check if domain is in whitelist (SSRF protection)
    const hostname = parsedUrl.hostname;
    if (!ALLOWED_DOMAINS.includes(hostname)) {
      console.warn(`[SECURITY] Blocked image proxy request to untrusted domain: ${hostname}`);
      return NextResponse.json(
        {
          error: 'Domain not allowed',
          message: `The domain '${hostname}' is not in the whitelist of trusted image sources`
        },
        { status: 403 }
      );
    }

    // Cache the image and get MinIO URL
    const cachedUrl = await cacheExternalImage(externalUrl);

    // Redirect to the cached image in MinIO
    return NextResponse.redirect(cachedUrl);
  } catch (error) {
    console.error('Image proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy image' },
      { status: 500 }
    );
  }
}
