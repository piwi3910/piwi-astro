import { NextRequest, NextResponse } from 'next/server';
import { cacheExternalImage } from '@/lib/image-cache';

/**
 * Image Proxy API
 * Caches external images in MinIO and redirects to cached URL
 * Usage: /api/image-proxy?url=https://example.com/image.jpg
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

    // Validate URL
    try {
      new URL(externalUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      );
    }

    // Cache the image and get MinIO URL
    const cachedUrl = await cacheExternalImage(externalUrl);

    // Redirect to the cached image in MinIO
    return NextResponse.redirect(cachedUrl);
  } catch (error) {
    console.error('Image proxy error:', error);
    // Fallback to original URL if caching fails
    const fallbackUrl = searchParams.get('url');
    if (fallbackUrl) {
      return NextResponse.redirect(fallbackUrl);
    }
    return NextResponse.json(
      { error: 'Failed to proxy image' },
      { status: 500 }
    );
  }
}
