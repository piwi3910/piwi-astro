import { Client } from 'minio';

const minioClient = new Client({
  endPoint: process.env.S3_ENDPOINT?.replace('http://', '') || 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
});

// Initialize bucket on startup
export async function initializeStorage(): Promise<void> {
  const bucketName = process.env.S3_BUCKET_NAME || 'astroplanner-images';

  try {
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log(`Created bucket: ${bucketName}`);
    }
  } catch (error) {
    console.error('Error initializing storage:', error);
    throw error;
  }
}

export { minioClient };
