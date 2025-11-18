/**
 * Import Comets from COBS (Comet Observation Database)
 *
 * Fetches current comets from COBS API and imports them with orbital data.
 * COBS API: https://cobs.si/help/cobs_api/
 *
 * Run with: npx tsx scripts/import-cobs-comets.ts
 */

import { PrismaClient } from '@prisma/client';

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

async function fetchComets(maxMag: number = 15): Promise<CobsComet[]> {
  console.log(`🌐 Fetching comets from COBS API (mag < ${maxMag})...`);

  try {
    // Fetch active comets brighter than specified magnitude
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
    return [];
  }
}

async function importComets() {
  console.log('☄️  Importing Comets from COBS...\n');

  // Fetch comets brighter than magnitude 15
  const comets = await fetchComets(15);

  if (comets.length === 0) {
    console.log('No comets found to import.');
    await prisma.$disconnect();
    return;
  }

  console.log(`\n📥 Importing ${comets.length} comets...\n`);

  let imported = 0;
  let updated = 0;
  let errors = 0;

  for (const comet of comets) {
    try {
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
        console.log(`  ↻ Updated: ${comet.fullname} (${currentMag?.toFixed(1)}m)`);
      } else {
        await prisma.target.create({
          data: cometData,
        });
        imported++;
        console.log(`  ✓ Added: ${comet.fullname} (${currentMag?.toFixed(1)}m)`);
      }
    } catch (error) {
      errors++;
      console.error(`  ✗ Error importing ${comet.name}:`, error);
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`  New: ${imported} comets`);
  console.log(`  Updated: ${updated} comets`);
  console.log(`  Errors: ${errors} comets`);

  // Show statistics
  const cometCount = await prisma.target.count({
    where: { type: 'Comet' },
  });

  const brightCount = await prisma.target.count({
    where: {
      type: 'Comet',
      magnitude: { lte: 10 },
    },
  });

  console.log(`\n📊 Database Statistics:`);
  console.log(`  Total comets: ${cometCount}`);
  console.log(`  Bright comets (≤10m): ${brightCount}`);
  console.log(`  Observable comets (≤15m): ${imported + updated}`);

  console.log(`\n💡 Next Steps:`);
  console.log(`  - Run this script periodically to update comet data`);
  console.log(`  - Implement orbital position calculations using elements`);
  console.log(`  - Fetch orbital elements from: https://cobs.si/api/elements.api`);

  await prisma.$disconnect();
}

importComets().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
