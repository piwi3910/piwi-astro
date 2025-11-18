/**
 * Fetch elevation and timezone data from GeoNames (fast, parallel calls)
 * Uses GeoNames API - faster and more reliable than other services
 * Free service with 20,000 requests/day
 * Uses SRTM1 (30m resolution) for high-precision elevation data
 */
async function fetchFromGeoNames(
  latitude: number,
  longitude: number
): Promise<{ elevation: number | null; timezone: string | null }> {
  try {
    // Get GeoNames username from environment variable
    const username = process.env.NEXT_PUBLIC_GEONAMES_USERNAME || 'demo';

    // Fetch both elevation and timezone in parallel for speed
    const [elevationRes, timezoneRes] = await Promise.all([
      fetch(`http://api.geonames.org/srtm1JSON?lat=${latitude}&lng=${longitude}&username=${username}`),
      fetch(`http://api.geonames.org/timezoneJSON?lat=${latitude}&lng=${longitude}&username=${username}`)
    ]);

    const [elevationData, timezoneData] = await Promise.all([
      elevationRes.ok ? elevationRes.json() : null,
      timezoneRes.ok ? timezoneRes.json() : null
    ]);

    return {
      elevation: typeof elevationData?.srtm1 === 'number' ? elevationData.srtm1 : null,
      timezone: timezoneData?.timezoneId || null,
    };
  } catch (error) {
    console.error('Error fetching from GeoNames:', error);
    return { elevation: null, timezone: null };
  }
}

/**
 * Estimate Bortle scale based on location characteristics
 * Uses reverse geocoding to determine if location is urban/rural
 */
export async function estimateBortleScale(
  latitude: number,
  longitude: number
): Promise<number | null> {
  try {
    // Use Nominatim reverse geocoding to get location info
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&extratags=1`
    );

    if (!response.ok) {
      return null; // Return null to allow manual selection
    }

    const data = await response.json();
    const address = data.address || {};

    // Estimate Bortle based on location type
    // Major cities: 8-9
    if (address.city) {
      const name = address.city.toLowerCase();
      const majorCities = ['london', 'paris', 'new york', 'tokyo', 'beijing', 'los angeles', 'moscow', 'delhi', 'shanghai', 'mumbai'];
      if (majorCities.some(city => name.includes(city))) {
        return 9; // Inner city
      }
      return 8; // City sky
    }

    // Towns and suburbs: 5-7
    if (address.town) {
      return 6; // Bright suburban sky
    }

    if (address.suburb) {
      return 5; // Suburban sky
    }

    // Villages: 3-4
    if (address.village || address.hamlet) {
      return 4; // Rural/suburban transition
    }

    // Remote areas: 1-3
    if (!address.city && !address.town && !address.suburb && !address.village) {
      return 2; // Typical dark sky
    }

    return null; // Unknown, allow manual selection
  } catch (error) {
    console.error('Error estimating Bortle scale:', error);
    return null;
  }
}

/**
 * Fetch all location data at once using GeoNames (fast single call)
 */
export async function fetchLocationData(
  latitude: number,
  longitude: number
): Promise<{
  elevation: number | null;
  timezone: string | null;
}> {
  // Use GeoNames which provides both in one fast call
  const data = await fetchFromGeoNames(latitude, longitude);

  return {
    elevation: data.elevation,
    timezone: data.timezone,
  };
}
