/**
 * Import OpenNGC Catalog into Database
 *
 * This script imports the OpenNGC catalog (NGC/IC objects) into the Target table.
 * Run with: npx tsx scripts/import-opengc-catalog.ts
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Type mapping from OpenNGC codes to human-readable types
const TYPE_MAP: Record<string, { type: string; subType?: string }> = {
  '*': { type: 'Star', subType: 'Single Star' },
  '**': { type: 'Star', subType: 'Double Star' },
  '*Ass': { type: 'Star', subType: 'Star Association' },
  'OCl': { type: 'Open Cluster' },
  'GCl': { type: 'Globular Cluster' },
  'Cl+N': { type: 'Cluster', subType: 'Cluster with Nebulosity' },
  'G': { type: 'Galaxy' },
  'GPair': { type: 'Galaxy', subType: 'Galaxy Pair' },
  'GTrpl': { type: 'Galaxy', subType: 'Galaxy Triplet' },
  'GGroup': { type: 'Galaxy', subType: 'Galaxy Group' },
  'PN': { type: 'Planetary Nebula' },
  'HII': { type: 'Emission Nebula', subType: 'HII Region' },
  'DrkN': { type: 'Dark Nebula' },
  'EmN': { type: 'Emission Nebula' },
  'Neb': { type: 'Nebula' },
  'RfN': { type: 'Reflection Nebula' },
  'SNR': { type: 'Supernova Remnant' },
  'Nova': { type: 'Star', subType: 'Nova' },
  'NonEx': { type: 'Non-Existent' }, // Objects that don't exist
  'Dup': { type: 'Duplicate' }, // Duplicate catalog entries
  'Other': { type: 'Other' },
};

/**
 * Convert RA from HH:MM:SS.SS to decimal degrees
 */
function raToDecimal(ra: string): number {
  const parts = ra.split(':');
  if (parts.length !== 3) return 0;

  const hours = parseFloat(parts[0]);
  const minutes = parseFloat(parts[1]);
  const seconds = parseFloat(parts[2]);

  return (hours + minutes / 60 + seconds / 3600) * 15; // 15 degrees per hour
}

/**
 * Convert Dec from ±DD:MM:SS.S to decimal degrees
 */
function decToDecimal(dec: string): number {
  const sign = dec.startsWith('-') ? -1 : 1;
  const parts = dec.replace(/^[+-]/, '').split(':');
  if (parts.length !== 3) return 0;

  const degrees = parseFloat(parts[0]);
  const minutes = parseFloat(parts[1]);
  const seconds = parseFloat(parts[2]);

  return sign * (degrees + minutes / 60 + seconds / 3600);
}

/**
 * Parse a single CSV row
 */
function parseRow(row: string): any | null {
  const fields = row.split(';');
  if (fields.length < 10) return null;

  const [
    name, type, ra, dec, constellation,
    majAx, minAx, posAng, bMag, vMag,
    jMag, hMag, kMag, surfBr, hubble,
    pax, pmRa, pmDec, radVel, redshift,
    cstarUMag, cstarBMag, cstarVMag,
    messier, ngc, ic, cstarNames,
    identifiers, commonNames, nedNotes, opengcNotes, sources
  ] = fields;

  // Skip non-existent and duplicate entries
  if (type === 'NonEx' || type === 'Dup') {
    return null;
  }

  // Skip objects without coordinates
  if (!ra || !dec || ra === '' || dec === '') {
    return null;
  }

  const typeInfo = TYPE_MAP[type] || { type: 'Other', subType: type };

  // Use visual magnitude, fall back to blue magnitude
  let magnitude = vMag && vMag !== '' ? parseFloat(vMag) : null;
  if (!magnitude && bMag && bMag !== '') {
    magnitude = parseFloat(bMag);
  }

  return {
    catalogId: name.trim(),
    name: commonNames && commonNames.trim() !== ''
      ? commonNames.split(',')[0].trim()
      : name.trim(),
    type: typeInfo.type,
    subType: typeInfo.subType || null,
    raDeg: raToDecimal(ra),
    decDeg: decToDecimal(dec),
    constellation: constellation && constellation.trim() !== '' ? constellation.trim() : null,
    sizeMajorArcmin: majAx && majAx !== '' ? parseFloat(majAx) : null,
    sizeMinorArcmin: minAx && minAx !== '' ? parseFloat(minAx) : null,
    magnitude,
    surfaceBrightness: surfBr && surfBr !== '' ? parseFloat(surfBr) : null,
    messierId: messier && messier.trim() !== '' ? messier.trim() : null,
    ngcId: ngc && ngc.trim() !== '' ? ngc.trim() : null,
    icId: ic && ic.trim() !== '' ? ic.trim() : null,
    otherNames: commonNames && commonNames.trim() !== '' ? commonNames.trim() : null,
    catalogSource: 'OPENGC',
  };
}

async function importCatalog() {
  console.log('🔭 Starting OpenNGC catalog import...\n');

  const csvPath = path.join(__dirname, 'data', 'NGC.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');

  console.log(`📊 Found ${lines.length - 1} total entries in catalog\n`);

  // Skip header row
  const dataLines = lines.slice(1);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  console.log('Importing objects...');

  for (const line of dataLines) {
    if (!line.trim()) continue;

    try {
      const target = parseRow(line);

      if (!target) {
        skipped++;
        continue;
      }

      // Upsert (update if exists, create if not)
      await prisma.target.upsert({
        where: { catalogId: target.catalogId },
        update: target,
        create: target,
      });

      imported++;

      if (imported % 1000 === 0) {
        console.log(`  ✓ Imported ${imported} objects...`);
      }
    } catch (error) {
      errors++;
      if (errors < 10) {
        console.error(`  ✗ Error importing line: ${line.substring(0, 50)}...`);
        console.error(`    ${error}`);
      }
    }
  }

  console.log('\n✅ Import complete!');
  console.log(`  Imported: ${imported} objects`);
  console.log(`  Skipped:  ${skipped} objects`);
  console.log(`  Errors:   ${errors} objects\n`);

  // Show some statistics
  const stats = await prisma.target.groupBy({
    by: ['type'],
    _count: true,
  });

  console.log('📈 Catalog breakdown by type:');
  stats
    .sort((a, b) => b._count - a._count)
    .forEach(stat => {
      console.log(`  ${stat.type.padEnd(20)} ${stat._count.toString().padStart(6)} objects`);
    });

  // Show Messier objects count
  const messierCount = await prisma.target.count({
    where: {
      messierId: { not: null },
    },
  });
  console.log(`\n🌟 Messier objects: ${messierCount}`);

  await prisma.$disconnect();
}

importCatalog().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
