import { Client } from 'minio';

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9002'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
});

const BUCKET_IMAGES = process.env.MINIO_BUCKET_IMAGES || 'astroplanner-images';
const BUCKET_CACHE = process.env.MINIO_BUCKET_CACHE || 'astroplanner-cache';

export async function ensureBucketExists(bucketName: string = BUCKET_IMAGES): Promise<void> {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log(`✅ Created MinIO bucket: ${bucketName}`);

      // Set bucket policy to allow public read
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      };
      await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
      console.log(`✅ Set public read policy for bucket: ${bucketName}`);
    }
  } catch (error) {
    console.error(`❌ Error ensuring bucket exists (${bucketName}):`, error);
    throw error;
  }
}

// Ensure both buckets exist on initialization
export async function initializeMinIO(): Promise<void> {
  await ensureBucketExists(BUCKET_IMAGES);
  await ensureBucketExists(BUCKET_CACHE);
}

export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
  bucketName: string = BUCKET_IMAGES
): Promise<string> {
  await ensureBucketExists(bucketName);

  const objectName = `${Date.now()}-${fileName}`;

  await minioClient.putObject(bucketName, objectName, fileBuffer, fileBuffer.length, {
    'Content-Type': contentType,
  });

  return objectName;
}

export async function getPresignedUrl(
  objectName: string,
  bucketName: string = BUCKET_IMAGES,
  expirySeconds: number = 3600
): Promise<string> {
  return await minioClient.presignedGetObject(bucketName, objectName, expirySeconds);
}

export async function getPublicUrl(objectName: string, bucketName: string = BUCKET_CACHE): string {
  const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
  const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
  const port = process.env.MINIO_PORT || '9002';
  return `${protocol}://${endpoint}:${port}/${bucketName}/${objectName}`;
}

export async function deleteFile(objectName: string, bucketName: string = BUCKET_IMAGES): Promise<void> {
  await minioClient.removeObject(bucketName, objectName);
}

export async function getFileMetadata(objectName: string, bucketName: string = BUCKET_IMAGES) {
  return await minioClient.statObject(bucketName, objectName);
}

export async function fileExists(objectName: string, bucketName: string = BUCKET_CACHE): Promise<boolean> {
  try {
    await minioClient.statObject(bucketName, objectName);
    return true;
  } catch (error) {
    return false;
  }
}

export { minioClient, BUCKET_IMAGES, BUCKET_CACHE };
