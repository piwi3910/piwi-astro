#!/usr/bin/env tsx
/**
 * Initialize MinIO buckets and test connection
 */

import { initializeMinIO, minioClient } from '../src/lib/minio';
import { cacheExternalImage } from '../src/lib/image-cache';

async function testMinIO() {
  console.log('🚀 Initializing MinIO...\n');

  try {
    // Initialize buckets
    await initializeMinIO();

    console.log('\n📊 Testing image caching...\n');

    // Test caching a planet image
    const testUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/OSIRIS_Mars_true_color.jpg/300px-OSIRIS_Mars_true_color.jpg';
    const cachedUrl = await cacheExternalImage(testUrl);

    console.log(`\n✅ Test successful!`);
    console.log(`   Original URL: ${testUrl}`);
    console.log(`   Cached URL: ${cachedUrl}`);

    console.log('\n✅ MinIO is ready!');
    console.log(`   Console: http://localhost:9003`);
    console.log(`   Username: minioadmin`);
    console.log(`   Password: minioadmin123`);
  } catch (error) {
    console.error('\n❌ MinIO initialization failed:', error);
    process.exit(1);
  }
}

testMinIO();
