/**
 * Add Solar System Objects (Planets + Moon)
 *
 * Run with: npx tsx scripts/add-solar-system.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const solarSystemObjects = [
  {
    catalogId: 'MERCURY',
    name: 'Mercury',
    type: 'Planet',
    subType: 'Inner Planet',
    isDynamic: true,
    solarSystemBody: 'Mercury',
    magnitude: -0.4, // Variable, this is approximate
    sizeMajorArcmin: 0.08, // Approximate angular size (varies greatly)
    catalogSource: 'SOLAR_SYSTEM',
  },
  {
    catalogId: 'VENUS',
    name: 'Venus',
    type: 'Planet',
    subType: 'Inner Planet',
    isDynamic: true,
    solarSystemBody: 'Venus',
    magnitude: -4.4, // Brightest planet
    sizeMajorArcmin: 0.67, // Approximate angular size (varies)
    catalogSource: 'SOLAR_SYSTEM',
  },
  {
    catalogId: 'MARS',
    name: 'Mars',
    type: 'Planet',
    subType: 'Outer Planet',
    isDynamic: true,
    solarSystemBody: 'Mars',
    magnitude: -2.0, // Variable
    sizeMajorArcmin: 0.27, // Approximate angular size (varies greatly)
    catalogSource: 'SOLAR_SYSTEM',
  },
  {
    catalogId: 'JUPITER',
    name: 'Jupiter',
    type: 'Planet',
    subType: 'Gas Giant',
    isDynamic: true,
    solarSystemBody: 'Jupiter',
    magnitude: -2.7, // Variable
    sizeMajorArcmin: 0.65, // Approximate angular size (varies)
    catalogSource: 'SOLAR_SYSTEM',
  },
  {
    catalogId: 'SATURN',
    name: 'Saturn',
    type: 'Planet',
    subType: 'Gas Giant',
    isDynamic: true,
    solarSystemBody: 'Saturn',
    magnitude: 0.5, // Variable
    sizeMajorArcmin: 0.27, // Approximate angular size (varies)
    catalogSource: 'SOLAR_SYSTEM',
  },
  {
    catalogId: 'URANUS',
    name: 'Uranus',
    type: 'Planet',
    subType: 'Ice Giant',
    isDynamic: true,
    solarSystemBody: 'Uranus',
    magnitude: 5.7,
    sizeMajorArcmin: 0.06,
    catalogSource: 'SOLAR_SYSTEM',
  },
  {
    catalogId: 'NEPTUNE',
    name: 'Neptune',
    type: 'Planet',
    subType: 'Ice Giant',
    isDynamic: true,
    solarSystemBody: 'Neptune',
    magnitude: 7.8,
    sizeMajorArcmin: 0.04,
    catalogSource: 'SOLAR_SYSTEM',
  },
  {
    catalogId: 'MOON',
    name: 'Moon',
    type: 'Natural Satellite',
    subType: 'Earth\'s Moon',
    isDynamic: true,
    solarSystemBody: 'Moon',
    magnitude: -12.7, // Full moon
    sizeMajorArcmin: 31.0, // Approximately 31 arcminutes (0.5 degrees)
    catalogSource: 'SOLAR_SYSTEM',
  },
];

async function addSolarSystemObjects() {
  console.log('🪐 Adding Solar System Objects...\n');

  for (const obj of solarSystemObjects) {
    try {
      await prisma.target.upsert({
        where: { catalogId: obj.catalogId },
        update: obj,
        create: obj,
      });
      console.log(`  ✓ Added: ${obj.name}`);
    } catch (error) {
      console.error(`  ✗ Error adding ${obj.name}:`, error);
    }
  }

  console.log('\n✅ Solar system objects added successfully!');
  console.log('\nNote: These objects have dynamic positions that change daily.');
  console.log('The visibility calculations will need to be updated to use');
  console.log('astronomy-engine for real-time positions.');

  await prisma.$disconnect();
}

addSolarSystemObjects().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
