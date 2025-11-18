#!/usr/bin/env tsx
/**
 * Delete comets that were manually added and are not from the COBS API
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupManualComets() {
  console.log('🧹 Cleaning up manually-added comets...\n');

  try {
    // Find all comets not from COBS
    const manualComets = await prisma.target.findMany({
      where: {
        type: 'Comet',
        catalogSource: {
          not: 'COBS',
        },
      },
      select: {
        id: true,
        catalogId: true,
        name: true,
        catalogSource: true,
      },
    });

    if (manualComets.length === 0) {
      console.log('✅ No manual comets found. Database is clean!');
      return;
    }

    console.log(`Found ${manualComets.length} manually-added comets to delete:\n`);
    manualComets.forEach((comet, index) => {
      console.log(`  ${index + 1}. ${comet.catalogId || 'NO_ID'} - ${comet.name} (source: ${comet.catalogSource})`);
    });

    console.log('\n🗑️  Deleting manual comets...\n');

    // Delete them
    const result = await prisma.target.deleteMany({
      where: {
        type: 'Comet',
        catalogSource: {
          not: 'COBS',
        },
      },
    });

    console.log(`✅ Deleted ${result.count} manually-added comets\n`);

    // Show remaining comets
    const remainingComets = await prisma.target.findMany({
      where: {
        type: 'Comet',
      },
      select: {
        catalogId: true,
        name: true,
        catalogSource: true,
        magnitude: true,
      },
      orderBy: {
        magnitude: 'asc',
      },
    });

    console.log(`📊 Remaining comets in database: ${remainingComets.length}\n`);
    if (remainingComets.length > 0) {
      console.log('All remaining comets (from COBS):');
      remainingComets.forEach((comet, index) => {
        const mag = comet.magnitude ? `${comet.magnitude.toFixed(1)}m` : 'N/A';
        console.log(`  ${index + 1}. ${comet.catalogId} - ${comet.name} (${mag}) [${comet.catalogSource}]`);
      });
    }

    console.log('\n✅ Cleanup complete!');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupManualComets();
