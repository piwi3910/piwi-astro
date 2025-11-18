/**
 * Add Popular Comets
 *
 * Comets are dynamic objects with highly elliptical orbits.
 * Their positions change significantly and require orbital elements or external APIs.
 *
 * Run with: npx tsx scripts/add-comets.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const popularComets = [
  {
    catalogId: '1P',
    name: 'Halley\'s Comet',
    type: 'Comet',
    subType: 'Periodic Comet',
    isDynamic: true,
    magnitude: 2.0, // At perihelion (varies greatly)
    catalogSource: 'COMET',
    otherNames: '1P/Halley, Comet Halley',
  },
  {
    catalogId: '67P',
    name: 'Churyumov–Gerasimenko',
    type: 'Comet',
    subType: 'Periodic Comet',
    isDynamic: true,
    magnitude: 11.0, // Approximate
    catalogSource: 'COMET',
    otherNames: '67P, Rosetta Comet',
  },
  {
    catalogId: '9P',
    name: 'Tempel 1',
    type: 'Comet',
    subType: 'Periodic Comet',
    isDynamic: true,
    magnitude: 11.0, // Approximate
    catalogSource: 'COMET',
    otherNames: '9P/Tempel, Deep Impact Comet',
  },
  {
    catalogId: '19P',
    name: 'Borrelly',
    type: 'Comet',
    subType: 'Periodic Comet',
    isDynamic: true,
    magnitude: 12.0, // Approximate
    catalogSource: 'COMET',
    otherNames: '19P/Borrelly',
  },
  {
    catalogId: '2P',
    name: 'Encke',
    type: 'Comet',
    subType: 'Periodic Comet',
    isDynamic: true,
    magnitude: 7.0, // Approximate
    catalogSource: 'COMET',
    otherNames: '2P/Encke',
  },
  {
    catalogId: '81P',
    name: 'Wild 2',
    type: 'Comet',
    subType: 'Periodic Comet',
    isDynamic: true,
    magnitude: 10.0, // Approximate
    catalogSource: 'COMET',
    otherNames: '81P/Wild, Stardust Comet',
  },
  {
    catalogId: 'C/2020 F3',
    name: 'NEOWISE',
    type: 'Comet',
    subType: 'Long-period Comet',
    isDynamic: true,
    magnitude: 1.0, // At peak brightness (2020)
    catalogSource: 'COMET',
    otherNames: 'C/2020 F3 (NEOWISE), Comet NEOWISE',
  },
  {
    catalogId: '103P',
    name: 'Hartley 2',
    type: 'Comet',
    subType: 'Periodic Comet',
    isDynamic: true,
    magnitude: 8.0, // Approximate
    catalogSource: 'COMET',
    otherNames: '103P/Hartley',
  },
];

async function addComets() {
  console.log('☄️  Adding Popular Comets...\n');

  for (const comet of popularComets) {
    try {
      await prisma.target.upsert({
        where: { catalogId: comet.catalogId },
        update: comet,
        create: comet,
      });
      console.log(`  ✓ Added: ${comet.name} (${comet.catalogId})`);
    } catch (error) {
      console.error(`  ✗ Error adding ${comet.name}:`, error);
    }
  }

  console.log('\n✅ Comets added successfully!');
  console.log('\n⚠️  IMPORTANT NOTES:');
  console.log('━'.repeat(60));
  console.log('Comets require orbital elements for accurate position calculation.');
  console.log('');
  console.log('To calculate comet positions, you need to:');
  console.log('1. Store orbital elements (a, e, i, Ω, ω, M0, epoch)');
  console.log('2. Use orbital mechanics formulas or astronomy-engine');
  console.log('3. Or integrate with NASA JPL Horizons API:');
  console.log('   https://ssd.jpl.nasa.gov/horizons/');
  console.log('');
  console.log('For now, these comets are placeholders. You\'ll need to:');
  console.log('- Update their positions from external sources');
  console.log('- Implement orbital calculation functions');
  console.log('- Or fetch real-time data from JPL Horizons API');
  console.log('━'.repeat(60));

  await prisma.$disconnect();
}

addComets().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
