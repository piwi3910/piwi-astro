#!/usr/bin/env tsx
/**
 * Start Background Job Worker
 *
 * This script starts the BullMQ worker that processes background jobs
 * for catalog updates, comet refreshes, etc.
 *
 * Run with: npx tsx scripts/start-worker.ts
 * Or add to package.json: "worker": "tsx scripts/start-worker.ts"
 */

import { createCatalogWorker } from '../src/lib/queue/workers/catalog-worker';

console.log('🚀 Starting AstroPl anner Background Worker...\n');

// Create and start the worker
const worker = createCatalogWorker();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n⏹️  Received SIGTERM, shutting down gracefully...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n⏹️  Received SIGINT, shutting down gracefully...');
  await worker.close();
  process.exit(0);
});

console.log('\n✅ Worker is running. Press Ctrl+C to stop.\n');
