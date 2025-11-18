import { NextResponse } from 'next/server';
import sharp from 'sharp';

/**
 * Convert radiance/brightness to Bortle scale
 * Based on typical color mapping in light pollution maps:
 * - Black/Dark Blue: Bortle 1-2 (excellent dark sky)
 * - Blue/Cyan: Bortle 3-4 (rural)
 * - Green/Yellow: Bortle 5-6 (suburban)
 * - Orange/Red: Bortle 7-8 (urban)
 * - White: Bortle 9 (inner city)
 */
function rgbToBortle(r: number, g: number, b: number): number {
  // Calculate overall brightness
  const brightness = (r + g + b) / 3;

  // Color dominance
  const redDominance = r / Math.max(g, b, 1);
  const greenDominance = g / Math.max(r, b, 1);
  const blueDominance = b / Math.max(r, g, 1);

  // Very dark (black/dark blue) - Excellent dark sky
  if (brightness < 30) {
    return blueDominance > 1.5 ? 2 : 1;
  }

  // Dark blue to cyan - Good dark sky
  if (brightness < 70) {
    return blueDominance > 1.2 ? 3 : 4;
  }

  // Green to yellow - Suburban
  if (brightness < 130) {
    return greenDominance > 1.1 ? 5 : 6;
  }

  // Orange to red - Urban
  if (brightness < 200) {
    return redDominance > 1.1 ? 7 : 8;
  }

  // Very bright (white/light) - Inner city
  return 9;
}

/**
 * Convert lat/lng to tile coordinates
 * djlorenz tiles use 1024x1024 pixel tiles
 */
function latLngToTile(lat: number, lng: number, zoom: number) {
  const latRad = (lat * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  const tileX = Math.floor(((lng + 180) / 360) * n);
  const tileY = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );

  // Calculate pixel position within tile (djlorenz tiles are 1024x1024)
  const tileSize = 1024;
  const pixelX = Math.floor(((((lng + 180) / 360) * n) - tileX) * tileSize);
  const pixelY = Math.floor(
    ((((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n) - tileY) * tileSize
  );

  return { tileX, tileY, pixelX, pixelY };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');

    if (!lat || !lng || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    // Use zoom level 8 for good balance between coverage and detail
    const zoom = 8;
    const { tileX, tileY, pixelX, pixelY } = latLngToTile(lat, lng, zoom);

    // Fetch the light pollution tile from djlorenz 2024 atlas
    const tileUrl = `https://djlorenz.github.io/astronomy/lp/image_tiles/tiles2024/tile_${zoom}_${tileX}_${tileY}.png`;

    const response = await fetch(tileUrl);
    if (!response.ok) {
      console.warn('Failed to fetch light pollution tile:', response.status);
      return NextResponse.json(
        { bortleScale: 5, method: 'default' }, // Default to moderate
        { status: 200 }
      );
    }

    const imageBuffer = await response.arrayBuffer();

    // Use sharp to read the pixel at the specific coordinates
    const image = sharp(Buffer.from(imageBuffer));
    const { data, info } = await image
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Ensure coordinates are within bounds
    const x = Math.min(Math.max(pixelX, 0), info.width - 1);
    const y = Math.min(Math.max(pixelY, 0), info.height - 1);

    // Get RGB values at the pixel position
    const pixelIndex = (y * info.width + x) * info.channels;
    const r = data[pixelIndex];
    const g = data[pixelIndex + 1];
    const b = data[pixelIndex + 2];

    // Convert RGB to Bortle scale
    const bortleScale = rgbToBortle(r, g, b);

    return NextResponse.json({
      bortleScale,
      method: 'tile-sampling',
      rgb: { r, g, b },
      coordinates: { lat, lng },
      tile: { zoom, tileX, tileY, pixelX: x, pixelY: y },
    });
  } catch (error) {
    console.error('Error fetching light pollution data:', error);
    return NextResponse.json(
      { bortleScale: 5, method: 'default', error: 'Failed to fetch data' },
      { status: 200 }
    );
  }
}
