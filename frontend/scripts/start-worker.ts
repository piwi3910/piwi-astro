#!/usr/bin/env tsx
/**
 * Start Background Job Workers
 *
 * This script starts the BullMQ workers that process background jobs:
 * - Catalog worker: catalog updates, comet refreshes, etc.
 * - Image worker: FITS/XISF processing, plate solving, target matching
 *
 * Run with: npx tsx scripts/start-worker.ts
 * Or add to package.json: "worker": "tsx scripts/start-worker.ts"
 */

import { createCatalogWorker } from '../src/lib/queue/workers/catalog-worker';
import { createImageWorker } from '../src/lib/queue/workers/image-worker';

console.log('🚀 Starting AstroPlanner Background Workers...\n');

// Create and start the workers
const catalogWorker = createCatalogWorker();
const imageWorker = createImageWorker();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n⏹️  Received SIGTERM, shutting down gracefully...');
  await Promise.all([catalogWorker.close(), imageWorker.close()]);
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n⏹️  Received SIGINT, shutting down gracefully...');
  await Promise.all([catalogWorker.close(), imageWorker.close()]);
  process.exit(0);
});

console.log('\n✅ Workers are running. Press Ctrl+C to stop.\n');
