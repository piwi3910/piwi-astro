import * as fs from 'fs';
import * as path from 'path';

interface TelescopeData {
  brand: string;
  model: string;
  apertureMm: number;
  focalLengthMm: number;
  focalRatio: number;
  externalId: string;
}

function parseTelescopeHTML(htmlContent: string): TelescopeData[] {
  const telescopes: TelescopeData[] = [];

  // Regex to match option tags with telescope data
  const optionRegex = /<option value="([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^"]+)">([^<]+)<\/option>/g;

  let match;
  while ((match = optionRegex.exec(htmlContent)) !== null) {
    const [, brand, model, aperture, focalLength, externalId] = match;

    const apertureMm = parseFloat(aperture);
    const focalLengthMm = parseFloat(focalLength);
    const focalRatio = focalLengthMm / apertureMm;

    // Normalize brand name (capitalize first letter)
    const normalizedBrand = brand.charAt(0).toUpperCase() + brand.slice(1);

    telescopes.push({
      brand: normalizedBrand,
      model: model.trim(),
      apertureMm,
      focalLengthMm,
      focalRatio: parseFloat(focalRatio.toFixed(2)),
      externalId: externalId.trim(),
    });
  }

  return telescopes;
}

async function main() {
  console.log('🔭 Parsing telescope catalog...');

  // Read the telescopes HTML file
  const telescopesPath = path.join(__dirname, '../../telescopes');
  const htmlContent = fs.readFileSync(telescopesPath, 'utf-8');

  // Parse the telescope data
  const telescopes = parseTelescopeHTML(htmlContent);

  console.log(`📊 Parsed ${telescopes.length} telescopes`);

  // Write to JSON file for seed script
  const outputPath = path.join(__dirname, 'telescope-catalog.json');
  fs.writeFileSync(outputPath, JSON.stringify(telescopes, null, 2));

  console.log(`✅ Telescope catalog written to ${outputPath}`);

  // Print some statistics
  const brands = new Set(telescopes.map(t => t.brand));
  console.log(`\n📈 Statistics:`);
  console.log(`   Total telescopes: ${telescopes.length}`);
  console.log(`   Unique brands: ${brands.size}`);
  console.log(`\n🏢 Top 10 brands:`);

  const brandCounts = telescopes.reduce((acc, t) => {
    acc[t.brand] = (acc[t.brand] || 0) + 1;
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
    console.error('❌ Error parsing telescopes:', error);
    process.exit(1);
  });
