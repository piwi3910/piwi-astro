/**
 * Image Caching Service
 * Lazily downloads and caches external images in MinIO
 */

import { minioClient, BUCKET_CACHE, fileExists, getPublicUrl } from './minio';
import crypto from 'crypto';

/**
 * Generate a cache key from a URL
 */
function getCacheKey(url: string): string {
  const hash = crypto.createHash('md5').update(url).digest('hex');

  // Extract extension from URL or query params
  let extension = 'jpg'; // Default

  // Check for format parameter in query string
  const formatMatch = url.match(/[?&]format=([^&]+)/);
  if (formatMatch) {
    extension = formatMatch[1];
  } else {
    // Try to get from file extension
    const pathMatch = url.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
    if (pathMatch) {
      extension = pathMatch[1];
    }
  }

  return `cached/${hash}.${extension}`;
}

/**
 * Download image from external URL
 */
async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Get content type from URL or buffer
 */
function getContentType(url: string): string {
  const extension = url.split('.').pop()?.split('?')[0]?.toLowerCase();
  const contentTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  return contentTypes[extension || 'jpg'] || 'image/jpeg';
}

/**
 * Cache an external image and return MinIO URL
 * If already cached, return the cached URL
 */
export async function cacheExternalImage(externalUrl: string): Promise<string> {
  const cacheKey = getCacheKey(externalUrl);

  // Check if already cached
  const exists = await fileExists(cacheKey, BUCKET_CACHE);
  if (exists) {
    console.log(`✅ Cache HIT: ${cacheKey}`);
    return getPublicUrl(cacheKey, BUCKET_CACHE);
  }

  console.log(`📥 Cache MISS: Downloading ${externalUrl}`);

  try {
    // Download image
    const imageBuffer = await downloadImage(externalUrl);
    const contentType = getContentType(externalUrl);

    // Upload to MinIO cache bucket
    await minioClient.putObject(
      BUCKET_CACHE,
      cacheKey,
      imageBuffer,
      imageBuffer.length,
      { 'Content-Type': contentType }
    );

    console.log(`✅ Cached: ${cacheKey} (${(imageBuffer.length / 1024).toFixed(2)} KB)`);

    return getPublicUrl(cacheKey, BUCKET_CACHE);
  } catch (error) {
    console.error(`❌ Failed to cache image: ${externalUrl}`, error);
    // Fallback to original URL if caching fails
    return externalUrl;
  }
}

/**
 * Pre-cache a list of images (useful for seeding)
 */
export async function preCacheImages(urls: string[]): Promise<void> {
  console.log(`🔄 Pre-caching ${urls.length} images...`);

  for (const url of urls) {
    try {
      await cacheExternalImage(url);
    } catch (error) {
      console.error(`❌ Failed to pre-cache: ${url}`, error);
    }
  }

  console.log(`✅ Pre-caching complete`);
}
