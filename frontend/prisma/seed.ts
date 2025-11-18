import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface TelescopeData {
  brand: string;
  model: string;
  apertureMm: number;
  focalLengthMm: number;
  focalRatio: number;
  externalId: string;
}

interface CameraData {
  brand: string;
  model: string;
  pixelSizeUm: number;
  resolutionX: number;
  resolutionY: number;
  sensorWidthMm: number;
  sensorHeightMm: number;
  externalId: string;
}

// Messier catalog data - first 20 objects as example
// In production, you'd import the full catalog from a data file
const messierCatalog = [
  { catalogId: 'M1', name: 'Crab Nebula', type: 'Supernova Remnant', raDeg: 83.6333, decDeg: 22.0145, sizeMajorArcmin: 6, sizeMinorArcmin: 4, magnitude: 8.4, constellation: 'Taurus' },
  { catalogId: 'M31', name: 'Andromeda Galaxy', type: 'Galaxy', raDeg: 10.6833, decDeg: 41.2692, sizeMajorArcmin: 178, sizeMinorArcmin: 63, magnitude: 3.4, constellation: 'Andromeda' },
  { catalogId: 'M42', name: 'Orion Nebula', type: 'Emission Nebula', raDeg: 83.8221, decDeg: -5.3911, sizeMajorArcmin: 65, sizeMinorArcmin: 60, magnitude: 4.0, constellation: 'Orion' },
  { catalogId: 'M45', name: 'Pleiades', type: 'Open Cluster', raDeg: 56.75, decDeg: 24.1167, sizeMajorArcmin: 110, sizeMinorArcmin: 110, magnitude: 1.6, constellation: 'Taurus' },
  { catalogId: 'M13', name: 'Hercules Cluster', type: 'Globular Cluster', raDeg: 250.4237, decDeg: 36.4617, sizeMajorArcmin: 20, sizeMinorArcmin: 20, magnitude: 5.8, constellation: 'Hercules' },
  { catalogId: 'M51', name: 'Whirlpool Galaxy', type: 'Galaxy', raDeg: 202.4696, decDeg: 47.1952, sizeMajorArcmin: 11, sizeMinorArcmin: 7, magnitude: 8.4, constellation: 'Canes Venatici' },
  { catalogId: 'M57', name: 'Ring Nebula', type: 'Planetary Nebula', raDeg: 283.3963, decDeg: 33.0297, sizeMajorArcmin: 1.4, sizeMinorArcmin: 1.0, magnitude: 8.8, constellation: 'Lyra' },
  { catalogId: 'M27', name: 'Dumbbell Nebula', type: 'Planetary Nebula', raDeg: 299.9017, decDeg: 22.7211, sizeMajorArcmin: 8, sizeMinorArcmin: 5.6, magnitude: 7.5, constellation: 'Vulpecula' },
  { catalogId: 'M8', name: 'Lagoon Nebula', type: 'Emission Nebula', raDeg: 270.9208, decDeg: -24.3806, sizeMajorArcmin: 90, sizeMinorArcmin: 40, magnitude: 6.0, constellation: 'Sagittarius' },
  { catalogId: 'M20', name: 'Trifid Nebula', type: 'Emission Nebula', raDeg: 270.0167, decDeg: -23.0319, sizeMajorArcmin: 28, sizeMinorArcmin: 28, magnitude: 6.3, constellation: 'Sagittarius' },
  { catalogId: 'M16', name: 'Eagle Nebula', type: 'Emission Nebula', raDeg: 274.7, decDeg: -13.8, sizeMajorArcmin: 7, sizeMinorArcmin: 7, magnitude: 6.4, constellation: 'Serpens' },
  { catalogId: 'M17', name: 'Omega Nebula', type: 'Emission Nebula', raDeg: 275.1958, decDeg: -16.1722, sizeMajorArcmin: 11, sizeMinorArcmin: 11, magnitude: 6.0, constellation: 'Sagittarius' },
  { catalogId: 'M33', name: 'Triangulum Galaxy', type: 'Galaxy', raDeg: 23.4621, decDeg: 30.6599, sizeMajorArcmin: 73, sizeMinorArcmin: 45, magnitude: 5.7, constellation: 'Triangulum' },
  { catalogId: 'M81', name: 'Bode\'s Galaxy', type: 'Galaxy', raDeg: 148.8883, decDeg: 69.0658, sizeMajorArcmin: 27, sizeMinorArcmin: 14, magnitude: 6.9, constellation: 'Ursa Major' },
  { catalogId: 'M82', name: 'Cigar Galaxy', type: 'Galaxy', raDeg: 148.9683, decDeg: 69.6797, sizeMajorArcmin: 11, sizeMinorArcmin: 4.3, magnitude: 8.4, constellation: 'Ursa Major' },
  { catalogId: 'M101', name: 'Pinwheel Galaxy', type: 'Galaxy', raDeg: 210.8023, decDeg: 54.3481, sizeMajorArcmin: 29, sizeMinorArcmin: 27, magnitude: 7.9, constellation: 'Ursa Major' },
  { catalogId: 'M104', name: 'Sombrero Galaxy', type: 'Galaxy', raDeg: 189.9976, decDeg: -11.6231, sizeMajorArcmin: 9, sizeMinorArcmin: 4, magnitude: 8.0, constellation: 'Virgo' },
  { catalogId: 'M106', name: 'NGC 4258', type: 'Galaxy', raDeg: 184.7396, decDeg: 47.3042, sizeMajorArcmin: 19, sizeMinorArcmin: 8, magnitude: 8.4, constellation: 'Canes Venatici' },
  { catalogId: 'M63', name: 'Sunflower Galaxy', type: 'Galaxy', raDeg: 198.9554, decDeg: 42.0292, sizeMajorArcmin: 13, sizeMinorArcmin: 8, magnitude: 8.6, constellation: 'Canes Venatici' },
  { catalogId: 'M64', name: 'Black Eye Galaxy', type: 'Galaxy', raDeg: 194.1821, decDeg: 21.6828, sizeMajorArcmin: 10, sizeMinorArcmin: 5, magnitude: 8.5, constellation: 'Coma Berenices' },
];

// Popular NGC objects
const ngcCatalog = [
  { catalogId: 'NGC 7000', name: 'North America Nebula', type: 'Emission Nebula', raDeg: 312.25, decDeg: 44.5, sizeMajorArcmin: 120, sizeMinorArcmin: 100, magnitude: 4.0, constellation: 'Cygnus' },
  { catalogId: 'NGC 6960', name: 'Veil Nebula West', type: 'Supernova Remnant', raDeg: 312.9, decDeg: 30.7, sizeMajorArcmin: 70, sizeMinorArcmin: 6, magnitude: 7.0, constellation: 'Cygnus' },
  { catalogId: 'NGC 6992', name: 'Veil Nebula East', type: 'Supernova Remnant', raDeg: 313.9, decDeg: 31.7, sizeMajorArcmin: 60, sizeMinorArcmin: 8, magnitude: 7.0, constellation: 'Cygnus' },
  { catalogId: 'NGC 7293', name: 'Helix Nebula', type: 'Planetary Nebula', raDeg: 337.4104, decDeg: -20.8378, sizeMajorArcmin: 16, sizeMinorArcmin: 12, magnitude: 7.6, constellation: 'Aquarius' },
  { catalogId: 'NGC 891', name: 'Silver Sliver Galaxy', type: 'Galaxy', raDeg: 35.6388, decDeg: 42.3492, sizeMajorArcmin: 14, sizeMinorArcmin: 3, magnitude: 9.9, constellation: 'Andromeda' },
  { catalogId: 'NGC 2244', name: 'Rosette Nebula Cluster', type: 'Open Cluster', raDeg: 98.2083, decDeg: 4.9, sizeMajorArcmin: 24, sizeMinorArcmin: 24, magnitude: 4.8, constellation: 'Monoceros' },
  { catalogId: 'NGC 2237', name: 'Rosette Nebula', type: 'Emission Nebula', raDeg: 97.9917, decDeg: 5.0333, sizeMajorArcmin: 80, sizeMinorArcmin: 60, magnitude: 9.0, constellation: 'Monoceros' },
  { catalogId: 'NGC 281', name: 'Pacman Nebula', type: 'Emission Nebula', raDeg: 11.8833, decDeg: 56.6, sizeMajorArcmin: 35, sizeMinorArcmin: 30, magnitude: 7.4, constellation: 'Cassiopeia' },
  { catalogId: 'NGC 7380', name: 'Wizard Nebula', type: 'Emission Nebula', raDeg: 341.5, decDeg: 58.0, sizeMajorArcmin: 25, sizeMinorArcmin: 25, magnitude: 7.2, constellation: 'Cepheus' },
  { catalogId: 'NGC 869', name: 'Double Cluster h Persei', type: 'Open Cluster', raDeg: 34.7708, decDeg: 57.1333, sizeMajorArcmin: 30, sizeMinorArcmin: 30, magnitude: 5.3, constellation: 'Perseus' },
];

async function main() {
  console.log('🌌 Seeding database...');

  // Seed Telescope Catalog
  console.log('\n🔭 Seeding telescope catalog...');
  const telescopeCatalogPath = path.join(__dirname, 'telescope-catalog.json');

  if (fs.existsSync(telescopeCatalogPath)) {
    const telescopeData: TelescopeData[] = JSON.parse(
      fs.readFileSync(telescopeCatalogPath, 'utf-8')
    );

    console.log(`📡 Adding ${telescopeData.length} telescopes...`);

    let added = 0;
    let updated = 0;

    for (const telescope of telescopeData) {
      const result = await prisma.telescopeCatalog.upsert({
        where: {
          brand_model_apertureMm_focalLengthMm: {
            brand: telescope.brand,
            model: telescope.model,
            apertureMm: telescope.apertureMm,
            focalLengthMm: telescope.focalLengthMm,
          },
        },
        update: {
          focalRatio: telescope.focalRatio,
          externalId: telescope.externalId,
        },
        create: telescope,
      });

      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        added++;
      } else {
        updated++;
      }
    }

    console.log(`✅ Telescope catalog: ${added} added, ${updated} updated`);
  } else {
    console.log('⚠️  Telescope catalog JSON not found. Run parse-telescopes.ts first.');
  }

  const totalTelescopes = await prisma.telescopeCatalog.count();
  console.log(`📊 Total telescopes in catalog: ${totalTelescopes}`);

  // Seed Camera Catalog
  console.log('\n📷 Seeding camera catalog...');
  const cameraCatalogPath = path.join(__dirname, 'camera-catalog.json');

  if (fs.existsSync(cameraCatalogPath)) {
    const cameraData: CameraData[] = JSON.parse(
      fs.readFileSync(cameraCatalogPath, 'utf-8')
    );

    console.log(`📡 Adding ${cameraData.length} cameras...`);

    let addedCameras = 0;
    let updatedCameras = 0;

    for (const camera of cameraData) {
      const result = await prisma.cameraCatalog.upsert({
        where: {
          brand_model_pixelSizeUm_resolutionX_resolutionY: {
            brand: camera.brand,
            model: camera.model,
            pixelSizeUm: camera.pixelSizeUm,
            resolutionX: camera.resolutionX,
            resolutionY: camera.resolutionY,
          },
        },
        update: {
          sensorWidthMm: camera.sensorWidthMm,
          sensorHeightMm: camera.sensorHeightMm,
          externalId: camera.externalId,
        },
        create: camera,
      });

      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        addedCameras++;
      } else {
        updatedCameras++;
      }
    }

    console.log(`✅ Camera catalog: ${addedCameras} added, ${updatedCameras} updated`);
  } else {
    console.log('⚠️  Camera catalog JSON not found. Run parse-cameras.ts first.');
  }

  const totalCameras = await prisma.cameraCatalog.count();
  console.log(`📊 Total cameras in catalog: ${totalCameras}`);

  // Seed Target Catalog
  console.log('\n🎯 Seeding target catalog...');

  // Seed Messier objects
  console.log('📡 Adding Messier objects...');
  for (const target of messierCatalog) {
    await prisma.target.upsert({
      where: { catalogId: target.catalogId },
      update: target,
      create: target,
    });
  }
  console.log(`✅ Added ${messierCatalog.length} Messier objects`);

  // Seed NGC objects
  console.log('📡 Adding NGC objects...');
  for (const target of ngcCatalog) {
    await prisma.target.upsert({
      where: { catalogId: target.catalogId },
      update: target,
      create: target,
    });
  }
  console.log(`✅ Added ${ngcCatalog.length} NGC objects`);

  const totalTargets = await prisma.target.count();
  console.log(`📊 Total targets in catalog: ${totalTargets}`);

  console.log('\n✨ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
