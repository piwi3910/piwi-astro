/**
 * Image Caching Service
 * Lazily downloads and caches external images in MinIO
 * Images are automatically optimized using sharp (resize, WebP conversion, compression)
 */

import { minioClient, BUCKET_CACHE, fileExists, getPublicUrl } from './minio';
import sharp from 'sharp';
import crypto from 'crypto';

/**
 * Generate a cache key from a URL
 * Always uses .webp extension since we convert all images to WebP
 */
function getCacheKey(url: string): string {
  const hash = crypto.createHash('md5').update(url).digest('hex');
  return `cached/${hash}.webp`;
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
 * Optimize image using sharp
 * - Resize to max 2048px (preserves aspect ratio)
 * - Convert to WebP format
 * - Apply 85% quality compression
 */
async function optimizeImage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const optimizedBuffer = await sharp(imageBuffer)
      .resize(2048, 2048, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();

    return optimizedBuffer;
  } catch (error) {
    console.error('⚠️ Image optimization failed, using original:', error);
    // Fallback to original if sharp fails
    return imageBuffer;
  }
}

/**
 * Cache an external image and return MinIO URL
 * If already cached, return the cached URL
 * Images are automatically optimized (resize, WebP conversion, compression)
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
    const originalBuffer = await downloadImage(externalUrl);
    const originalSize = originalBuffer.length;

    // Optimize image (resize, WebP conversion, compression)
    const optimizedBuffer = await optimizeImage(originalBuffer);
    const optimizedSize = optimizedBuffer.length;

    // Calculate compression ratio
    const compressionRatio = ((1 - optimizedSize / originalSize) * 100).toFixed(1);

    // Upload optimized image to MinIO cache bucket
    await minioClient.putObject(
      BUCKET_CACHE,
      cacheKey,
      optimizedBuffer,
      optimizedBuffer.length,
      { 'Content-Type': 'image/webp' }
    );

    console.log(
      `✅ Cached: ${cacheKey} | Original: ${(originalSize / 1024).toFixed(2)} KB → Optimized: ${(optimizedSize / 1024).toFixed(2)} KB (${compressionRatio}% smaller)`
    );

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
