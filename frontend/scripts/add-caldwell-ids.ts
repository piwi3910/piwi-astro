/**
 * Add Caldwell IDs to existing NGC/IC objects
 *
 * The Caldwell catalog consists of 109 deep-sky objects.
 * Most are already in the database as NGC/IC objects.
 * This script adds the Caldwell cross-reference.
 *
 * Run with: npx tsx scripts/add-caldwell-ids.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Caldwell to NGC/IC mapping (popular subset - full list would be 109 objects)
const caldwellMappings = [
  // Some of the most popular Caldwell objects
  { caldwell: 'C1', ngc: 'NGC188', name: 'Open Cluster in Cepheus' },
  { caldwell: 'C2', ngc: 'NGC40', name: 'Bow Tie Nebula' },
  { caldwell: 'C3', ngc: 'NGC4236', name: 'Galaxy in Draco' },
  { caldwell: 'C4', ngc: 'NGC7023', name: 'Iris Nebula' },
  { caldwell: 'C5', ngc: 'IC342', name: 'Hidden Galaxy' },
  { caldwell: 'C6', ngc: 'NGC6543', name: 'Cat\'s Eye Nebula' },
  { caldwell: 'C7', ngc: 'NGC2403', name: 'Galaxy in Camelopardalis' },
  { caldwell: 'C8', ngc: 'NGC559', name: 'Open Cluster in Cassiopeia' },
  { caldwell: 'C9', ngc: 'IC1805', name: 'Heart Nebula' },
  { caldwell: 'C10', ngc: 'NGC663', name: 'Open Cluster in Cassiopeia' },
  { caldwell: 'C11', ngc: 'NGC7635', name: 'Bubble Nebula' },
  { caldwell: 'C12', ngc: 'NGC6946', name: 'Fireworks Galaxy' },
  { caldwell: 'C13', ngc: 'NGC457', name: 'Owl Cluster' },
  { caldwell: 'C14', ngc: 'NGC869', name: 'Double Cluster (part 1)' },
  { caldwell: 'C15', ngc: 'NGC6826', name: 'Blinking Planetary' },
  { caldwell: 'C16', ngc: 'NGC7243', name: 'Open Cluster in Lacerta' },
  { caldwell: 'C17', ngc: 'NGC147', name: 'Galaxy in Cassiopeia' },
  { caldwell: 'C18', ngc: 'NGC185', name: 'Galaxy in Cassiopeia' },
  { caldwell: 'C19', ngc: 'IC5146', name: 'Cocoon Nebula' },
  { caldwell: 'C20', ngc: 'NGC7000', name: 'North America Nebula' },
  { caldwell: 'C21', ngc: 'NGC4449', name: 'Box Galaxy' },
  { caldwell: 'C22', ngc: 'NGC7662', name: 'Blue Snowball Nebula' },
  { caldwell: 'C23', ngc: 'NGC891', name: 'Silver Sliver Galaxy' },
  { caldwell: 'C24', ngc: 'NGC1275', name: 'Perseus A' },
  { caldwell: 'C25', ngc: 'NGC2419', name: 'Intergalactic Wanderer' },
  { caldwell: 'C27', ngc: 'NGC6888', name: 'Crescent Nebula' },
  { caldwell: 'C28', ngc: 'NGC752', name: 'Open Cluster in Andromeda' },
  { caldwell: 'C29', ngc: 'NGC5005', name: 'Galaxy in Canes Venatici' },
  { caldwell: 'C30', ngc: 'NGC7331', name: 'Deer Lick Group' },
  { caldwell: 'C31', ngc: 'IC405', name: 'Flaming Star Nebula' },
  { caldwell: 'C32', ngc: 'NGC4631', name: 'Whale Galaxy' },
  { caldwell: 'C33', ngc: 'NGC6992', name: 'Eastern Veil Nebula' },
  { caldwell: 'C34', ngc: 'NGC6960', name: 'Western Veil Nebula' },
  { caldwell: 'C35', ngc: 'NGC4889', name: 'Coma Cluster Galaxy' },
  { caldwell: 'C36', ngc: 'NGC4559', name: 'Galaxy in Coma Berenices' },
  { caldwell: 'C41', ngc: 'NGC4565', name: 'Needle Galaxy' },
  { caldwell: 'C45', ngc: 'NGC5248', name: 'Galaxy in Boötes' },
  { caldwell: 'C46', ngc: 'NGC2261', name: 'Hubble\'s Variable Nebula' },
  { caldwell: 'C49', ngc: 'NGC2237', name: 'Rosette Nebula' },
  { caldwell: 'C51', ngc: 'IC1613', name: 'Galaxy in Cetus' },
  { caldwell: 'C55', ngc: 'NGC7009', name: 'Saturn Nebula' },
  { caldwell: 'C63', ngc: 'NGC7293', name: 'Helix Nebula' },
  { caldwell: 'C65', ngc: 'NGC253', name: 'Sculptor Galaxy' },
  { caldwell: 'C69', ngc: 'NGC6302', name: 'Bug Nebula' },
  { caldwell: 'C72', ngc: 'NGC55', name: 'Galaxy in Sculptor' },
  { caldwell: 'C76', ngc: 'NGC6231', name: 'Northern Jewel Box' },
  { caldwell: 'C77', ngc: 'NGC5128', name: 'Centaurus A' },
  { caldwell: 'C78', ngc: 'NGC6541', name: 'Globular Cluster in Corona Australis' },
  { caldwell: 'C80', ngc: 'NGC5139', name: 'Omega Centauri' },
  { caldwell: 'C83', ngc: 'NGC4945', name: 'Galaxy in Centaurus' },
  { caldwell: 'C86', ngc: 'NGC6397', name: 'Globular Cluster in Ara' },
  { caldwell: 'C92', ngc: 'NGC3372', name: 'Eta Carinae Nebula' },
  { caldwell: 'C94', ngc: 'NGC4755', name: 'Jewel Box Cluster' },
  { caldwell: 'C95', ngc: 'NGC6025', name: 'Open Cluster in Triangulum Australe' },
  { caldwell: 'C96', ngc: 'NGC2516', name: 'Southern Beehive' },
  { caldwell: 'C97', ngc: 'NGC3766', name: 'Pearl Cluster' },
  { caldwell: 'C99', ngc: 'IC2944', name: 'Running Chicken Nebula' },
  { caldwell: 'C100', ngc: 'IC2944', name: 'Lambda Centauri Nebula' },
  { caldwell: 'C102', ngc: 'IC2602', name: 'Southern Pleiades' },
  { caldwell: 'C103', ngc: 'NGC2070', name: 'Tarantula Nebula' },
  { caldwell: 'C106', ngc: 'NGC104', name: '47 Tucanae' },
];

async function addCaldwellIds() {
  console.log('🔭 Adding Caldwell IDs to existing NGC/IC objects...\n');

  let updated = 0;
  let notFound = 0;

  for (const mapping of caldwellMappings) {
    try {
      // Try to find by NGC ID
      const target = await prisma.target.findFirst({
        where: {
          OR: [
            { ngcId: mapping.ngc },
            { catalogId: mapping.ngc },
            { icId: mapping.ngc },
          ],
        },
      });

      if (target) {
        await prisma.target.update({
          where: { id: target.id },
          data: {
            caldwellId: mapping.caldwell,
            otherNames: target.otherNames
              ? `${target.otherNames}, ${mapping.name}`
              : mapping.name,
          },
        });
        console.log(`  ✓ ${mapping.caldwell} → ${mapping.ngc} (${mapping.name})`);
        updated++;
      } else {
        console.log(`  ⚠ ${mapping.caldwell} → ${mapping.ngc} not found in database`);
        notFound++;
      }
    } catch (error) {
      console.error(`  ✗ Error updating ${mapping.caldwell}:`, error);
    }
  }

  console.log(`\n✅ Caldwell catalog update complete!`);
  console.log(`  Updated: ${updated} objects`);
  console.log(`  Not found: ${notFound} objects`);
  console.log(`\nNote: This added ${caldwellMappings.length} of the 109 Caldwell objects.`);
  console.log(`Many NGC/IC objects already in your database are part of the Caldwell catalog.`);

  await prisma.$disconnect();
}

addCaldwellIds().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
