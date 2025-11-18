/**
 * Catalog Update Worker
 * Processes jobs for updating astronomical catalogs (comets, etc.)
 */
import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import redisConnection from '../redis';
import type { UpdateCometsJobData, CleanupOldDataJobData } from '../queues';

const prisma = new PrismaClient();

interface CobsComet {
  id: number;
  type: string;
  name: string;
  fullname: string;
  mpc_name: string;
  icq_name: string;
  component: string | null;
  current_mag: string;
  perihelion_date: string;
  perihelion_mag: string;
  peak_mag: string;
  peak_mag_date: string;
  is_observed: boolean;
  is_active: boolean;
}

interface CobsResponse {
  objects: CobsComet[];
  info: {
    count: number;
    page: number;
    pages: number;
  };
}

/**
 * Fetch comets from COBS API
 */
async function fetchCometsFromCobs(maxMag: number = 15): Promise<CobsComet[]> {
  console.log(`🌐 Fetching comets from COBS API (mag < ${maxMag})...`);

  try {
    const url = `https://cobs.si/api/comet_list.api?is-active=true&cur-mag=${maxMag}&page=1`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: CobsResponse = await response.json();
    console.log(`  ✓ Found ${data.objects.length} comets (page ${data.info.page} of ${data.info.pages})`);
    return data.objects;
  } catch (error) {
    console.error('  ✗ Error fetching comets from COBS:', error);
    throw error;
  }
}

/**
 * Update comets in database from COBS
 */
async function updateCometsJob(job: Job<UpdateCometsJobData>) {
  const { maxMagnitude = 15 } = job.data;

  console.log(`☄️  [Job ${job.id}] Starting comet update (max mag: ${maxMagnitude})...`);

  const comets = await fetchCometsFromCobs(maxMagnitude);

  if (comets.length === 0) {
    console.log('No comets found to import.');
    return { imported: 0, updated: 0, errors: 0 };
  }

  let imported = 0;
  let updated = 0;
  let errors = 0;

  for (const comet of comets) {
    try {
      // Update job progress
      await job.updateProgress((comets.indexOf(comet) / comets.length) * 100);

      // Parse dates
      const perihelionDate = comet.perihelion_date ? new Date(comet.perihelion_date) : null;
      const peakMagDate = comet.peak_mag_date ? new Date(comet.peak_mag_date) : null;

      // Parse magnitudes
      const currentMag = comet.current_mag ? parseFloat(comet.current_mag) : null;
      const perihelionMag = comet.perihelion_mag ? parseFloat(comet.perihelion_mag) : null;
      const peakMag = comet.peak_mag ? parseFloat(comet.peak_mag) : null;

      // Determine comet subtype
      let subType = 'Comet';
      if (comet.type === 'P') subType = 'Periodic Comet';
      else if (comet.type === 'C') subType = 'Long-period Comet';
      else if (comet.type === 'I') subType = 'Interstellar Comet';
      else if (comet.type === 'A') subType = 'Asteroid';

      const cometData = {
        catalogId: comet.name,
        name: comet.fullname || comet.name,
        type: 'Comet',
        subType,
        isDynamic: true,
        magnitude: currentMag,
        cometType: comet.type,
        perihelionDate,
        perihelionMag,
        peakMag,
        peakMagDate,
        isObserved: comet.is_observed,
        cobsId: comet.id,
        catalogSource: 'COBS',
        lastUpdated: new Date(),
        otherNames: [comet.mpc_name, comet.icq_name, comet.component]
          .filter(Boolean)
          .join(', ') || null,
      };

      // Upsert comet
      const existing = await prisma.target.findFirst({
        where: { catalogId: comet.name },
      });

      if (existing) {
        await prisma.target.update({
          where: { id: existing.id },
          data: cometData,
        });
        updated++;
      } else {
        await prisma.target.create({
          data: cometData,
        });
        imported++;
      }
    } catch (error) {
      errors++;
      console.error(`  ✗ Error importing ${comet.name}:`, error);
    }
  }

  const result = { imported, updated, errors };
  console.log(`✅ [Job ${job.id}] Comet update complete:`, result);
  return result;
}

/**
 * Cleanup old dynamic data
 */
async function cleanupOldDataJob(job: Job<CleanupOldDataJobData>) {
  const { daysOld } = job.data;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  console.log(`🧹 [Job ${job.id}] Cleaning up data older than ${daysOld} days (before ${cutoffDate.toISOString()})...`);

  // For now, we don't delete comets, but we could add logic to:
  // - Remove comets that haven't been updated in a while and are no longer active
  // - Clean up old cached data
  // - etc.

  const result = {
    cleaned: 0,
    cutoffDate: cutoffDate.toISOString(),
  };

  console.log(`✅ [Job ${job.id}] Cleanup complete:`, result);
  return result;
}

/**
 * Create and start the catalog update worker
 */
export function createCatalogWorker() {
  const worker = new Worker(
    'catalog-updates',
    async (job) => {
      console.log(`\n🚀 Processing job: ${job.name} (ID: ${job.id})`);

      switch (job.name) {
        case 'update-comets':
          return await updateCometsJob(job as Job<UpdateCometsJobData>);

        case 'cleanup-old-data':
          return await cleanupOldDataJob(job as Job<CleanupOldDataJobData>);

        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    },
    {
      connection: redisConnection,
      concurrency: 1, // Process one job at a time
    }
  );

  worker.on('completed', (job, result) => {
    console.log(`✅ Job ${job.id} completed:`, result);
  });

  worker.on('failed', (job, error) => {
    console.error(`❌ Job ${job?.id} failed:`, error.message);
  });

  worker.on('error', (error) => {
    console.error('❌ Worker error:', error);
  });

  console.log('👷 Catalog update worker started');

  return worker;
}

// Start worker if this file is run directly
if (require.main === module) {
  createCatalogWorker();
  console.log('Worker is running. Press Ctrl+C to stop.');
}
