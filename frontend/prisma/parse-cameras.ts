import * as fs from 'fs';
import * as path from 'path';

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

// Known brand name mappings for inconsistent source data
const BRAND_MAPPINGS: Record<string, string> = {
  'alccd': 'ALCCD',
  'altair astro': 'Altair Astro',
  'astro video systems': 'Astro Video Systems',
  'atik': 'Atik',
  'canon': 'Canon',
  'celestron': 'Celestron',
  'dwarflab': 'DWARFLAB',
  'fli': 'FLI',
  'fujifilm': 'Fujifilm',
  'hasselblad': 'Hasselblad',
  'imaging source': 'Imaging Source',
  'inova': 'iNova',
  'lacerta': 'Lacerta',
  'lumix': 'Lumix',
  'mallincam': 'MallinCam',
  'meade': 'Meade',
  'microsoft': 'Microsoft',
  'moravian': 'Moravian',
  'moravian instruments': 'Moravian Instruments',
  'nasa': 'NASA',
  'nikon': 'Nikon',
  'olympus': 'Olympus',
  'opticstar': 'Opticstar',
  'orion': 'Orion',
  'panasonic': 'Panasonic',
  'pco imaging': 'PCO Imaging',
  'pegasus': 'Pegasus',
  'pentax': 'Pentax',
  'phil dyer': 'Phil Dyer',
  'phillips': 'Phillips',
  'player one': 'Player One',
  'point grey': 'Point Grey',
  'point grey research': 'Point Grey Research',
  'pt grey': 'Pt Grey',
  'qhy': 'QHY',
  'qsi': 'QSI',
  'rasberrypi v2': 'RasberryPi v2',
  'raspberry pi camera': 'Raspberry Pi Camera',
  's-big': 'SBIG',
  'sbig': 'SBIG',
  'seestar': 'Seestar',
  'sony': 'Sony',
  'starlight xpress': 'Starlight Xpress',
  'svbony': 'SVBONY',
  'toucam pro': 'Toucam Pro',
  'touptek': 'ToupTek',
  'unistellar': 'Unistellar',
  'zwo': 'ZWO',
};

function normalizeBrandName(brand: string): string {
  // Trim whitespace
  const trimmed = brand.trim();

  // Handle empty string
  if (!trimmed) return '';

  // Check brand mappings first (case-insensitive)
  const lowerBrand = trimmed.toLowerCase();
  if (BRAND_MAPPINGS[lowerBrand]) {
    return BRAND_MAPPINGS[lowerBrand];
  }

  // Convert to lowercase first
  const lower = trimmed.toLowerCase();

  // Split by spaces and hyphens to handle multi-word brands
  const words = lower.split(/(\s+|-)/);

  // Capitalize first letter of each word, preserve separators
  const normalized = words
    .map((word) => {
      // Keep separators (spaces, hyphens) as-is
      if (word.match(/^[\s-]+$/)) return word;
      // Capitalize first letter of word
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join('');

  return normalized;
}

function parseCameraHTML(htmlContent: string): CameraData[] {
  const cameras: CameraData[] = [];

  // Regex to match option tags with camera data
  // Format: brand|model|pixelX|pixelY|resX|resY|id
  const optionRegex = /<option value="([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^"]+)">([^<]+)<\/option>/g;

  let match;
  while ((match = optionRegex.exec(htmlContent)) !== null) {
    const [, brand, model, pixelX, pixelY, resX, resY, externalId] = match;

    const pixelSizeUm = parseFloat(pixelX);
    const resolutionX = parseInt(resX);
    const resolutionY = parseInt(resY);

    // Calculate sensor size from pixel size and resolution
    // sensorWidth = resolutionX * pixelSize / 1000 (convert µm to mm)
    const sensorWidthMm = (resolutionX * pixelSizeUm) / 1000;
    const sensorHeightMm = (resolutionY * parseFloat(pixelY)) / 1000;

    // Normalize brand name to consistent capitalization
    const normalizedBrand = normalizeBrandName(brand);

    cameras.push({
      brand: normalizedBrand,
      model: model.trim(),
      pixelSizeUm,
      resolutionX,
      resolutionY,
      sensorWidthMm: parseFloat(sensorWidthMm.toFixed(2)),
      sensorHeightMm: parseFloat(sensorHeightMm.toFixed(2)),
      externalId: externalId.trim(),
    });
  }

  return cameras;
}

async function main() {
  console.log('📷 Parsing camera catalog...');

  // Read the cameras HTML file
  const camerasPath = path.join(__dirname, '../../cameras');
  const htmlContent = fs.readFileSync(camerasPath, 'utf-8');

  // Parse the camera data
  const cameras = parseCameraHTML(htmlContent);

  console.log(`📊 Parsed ${cameras.length} cameras`);

  // Write to JSON file for seed script
  const outputPath = path.join(__dirname, 'camera-catalog.json');
  fs.writeFileSync(outputPath, JSON.stringify(cameras, null, 2));

  console.log(`✅ Camera catalog written to ${outputPath}`);

  // Print some statistics
  const brands = new Set(cameras.map((c) => c.brand));
  console.log(`\n📈 Statistics:`);
  console.log(`   Total cameras: ${cameras.length}`);
  console.log(`   Unique brands: ${brands.size}`);
  console.log(`\n🏢 Top 10 brands:`);

  const brandCounts = cameras.reduce((acc, c) => {
    acc[c.brand] = (acc[c.brand] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(brandCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([brand, count]) => {
      console.log(`   ${brand}: ${count}`);
    });
}

main()
  .then(() => {
    console.log('\n✨ Parsing completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error parsing cameras:', error);
    process.exit(1);
  });
