/**
 * Visibility Calculations for Astronomical Objects
 * Uses astronomy-engine for accurate rise/set times and position calculations
 */

import * as Astronomy from 'astronomy-engine';

export interface ObserverLocation {
  latitude: number;  // Degrees
  longitude: number; // Degrees
  elevation?: number; // Meters above sea level
}

export interface TargetCoordinates {
  raDeg: number;  // Right Ascension in degrees
  decDeg: number; // Declination in degrees
}

export interface AltitudeAzimuth {
  altitude: number; // Degrees above horizon (0-90)
  azimuth: number;  // Degrees from North (0-360)
}

export interface VisibilityWindow {
  rise: Date | null;    // When object rises above horizon
  set: Date | null;     // When object sets below horizon
  meridian: Date | null; // When object crosses meridian (highest point)
  maxAltitude: number;  // Maximum altitude during the night
  isCircumpolar: boolean; // Never sets (always visible)
  isNeverVisible: boolean; // Never rises (never visible)
}

export interface TargetVisibility {
  currentAltitude: number;
  currentAzimuth: number;
  isCurrentlyVisible: boolean; // Above minimum altitude
  window: VisibilityWindow;
}

const MIN_ALTITUDE = 15; // Minimum altitude for practical observation (degrees)

/**
 * Calculate altitude and azimuth for a target at a specific time and location
 */
export function calculateAltitudeAzimuth(
  target: TargetCoordinates,
  location: ObserverLocation,
  date: Date = new Date()
): AltitudeAzimuth {
  // Create observer
  const observer = new Astronomy.Observer(
    location.latitude,
    location.longitude,
    location.elevation || 0
  );

  // Convert RA/Dec to equatorial coordinates
  // astronomy-engine uses a different coordinate system internally
  // We need to create an Equatorial object with hour angle
  const raHours = target.raDeg / 15; // Convert degrees to hours

  // Convert to horizontal coordinates (altitude/azimuth)
  const horizontal = Astronomy.Horizon(date, observer, raHours, target.decDeg, 'normal');

  return {
    altitude: horizontal.altitude,
    azimuth: horizontal.azimuth,
  };
}

/**
 * Calculate rise and set times for a target on a given date
 * This is an approximation using the hour angle method
 */
export function calculateRiseSetTimes(
  target: TargetCoordinates,
  location: ObserverLocation,
  date: Date = new Date()
): VisibilityWindow {
  const lat = (location.latitude * Math.PI) / 180; // Convert to radians
  const dec = (target.decDeg * Math.PI) / 180;

  // Check if circumpolar or never visible
  const isCircumpolar = Math.abs(lat - Math.PI / 2) <= Math.abs(dec);
  const isNeverVisible = Math.abs(lat + Math.PI / 2) <= Math.abs(dec);

  if (isCircumpolar && location.latitude > 0 && target.decDeg > 0) {
    // Northern hemisphere, object never sets
    return {
      rise: null,
      set: null,
      meridian: calculateMeridianCrossing(target, location, date),
      maxAltitude: 90 - Math.abs(location.latitude - target.decDeg),
      isCircumpolar: true,
      isNeverVisible: false,
    };
  }

  if (isNeverVisible) {
    return {
      rise: null,
      set: null,
      meridian: null,
      maxAltitude: 0,
      isCircumpolar: false,
      isNeverVisible: true,
    };
  }

  // Calculate hour angle at horizon
  const cosH = -Math.tan(lat) * Math.tan(dec);

  if (Math.abs(cosH) > 1) {
    // Object never rises or never sets
    return {
      rise: null,
      set: null,
      meridian: null,
      maxAltitude: 0,
      isCircumpolar: false,
      isNeverVisible: true,
    };
  }

  const H = Math.acos(cosH);
  const H_hours = (H * 12) / Math.PI; // Convert to hours

  // Calculate meridian crossing (when RA = LST)
  const meridian = calculateMeridianCrossing(target, location, date);

  if (!meridian) {
    return {
      rise: null,
      set: null,
      meridian: null,
      maxAltitude: 0,
      isCircumpolar: false,
      isNeverVisible: true,
    };
  }

  // Rise and set times relative to meridian crossing
  const rise = new Date(meridian.getTime() - H_hours * 60 * 60 * 1000);
  const set = new Date(meridian.getTime() + H_hours * 60 * 60 * 1000);

  // Calculate maximum altitude (at meridian crossing)
  const maxAltitude = 90 - Math.abs(location.latitude - target.decDeg);

  return {
    rise,
    set,
    meridian,
    maxAltitude,
    isCircumpolar: false,
    isNeverVisible: false,
  };
}

/**
 * Calculate when the target crosses the meridian (highest point in sky)
 */
function calculateMeridianCrossing(
  target: TargetCoordinates,
  location: ObserverLocation,
  date: Date
): Date | null {
  // Local Sidereal Time at meridian crossing equals RA
  // This is a simplified calculation
  const raHours = target.raDeg / 15;

  // Get Greenwich Sidereal Time for the date
  const gst = Astronomy.SiderealTime(date);

  // Local Sidereal Time = GST + longitude (in hours)
  const longitudeHours = location.longitude / 15;

  // Calculate hour difference
  let hourDiff = raHours - (gst + longitudeHours);

  // Normalize to 0-24 range
  while (hourDiff < 0) hourDiff += 24;
  while (hourDiff >= 24) hourDiff -= 24;

  // If more than 12 hours away, use next day
  if (hourDiff > 12) hourDiff -= 24;

  const meridianTime = new Date(date.getTime() + hourDiff * 60 * 60 * 1000);

  return meridianTime;
}

/**
 * Get complete visibility information for a target
 */
export function getTargetVisibility(
  target: TargetCoordinates,
  location: ObserverLocation,
  date: Date = new Date()
): TargetVisibility {
  const { altitude, azimuth } = calculateAltitudeAzimuth(target, location, date);
  const window = calculateRiseSetTimes(target, location, date);

  return {
    currentAltitude: altitude,
    currentAzimuth: azimuth,
    isCurrentlyVisible: altitude >= MIN_ALTITUDE,
    window,
  };
}

/**
 * Calculate altitude for multiple times throughout the night
 * Useful for generating visibility charts
 */
export function calculateAltitudeOverTime(
  target: TargetCoordinates,
  location: ObserverLocation,
  startDate: Date,
  hours: number = 12,
  intervalMinutes: number = 30
): Array<{ time: Date; altitude: number; azimuth: number }> {
  const points: Array<{ time: Date; altitude: number; azimuth: number }> = [];
  const intervals = (hours * 60) / intervalMinutes;

  for (let i = 0; i <= intervals; i++) {
    const time = new Date(startDate.getTime() + i * intervalMinutes * 60 * 1000);
    const { altitude, azimuth } = calculateAltitudeAzimuth(target, location, time);

    points.push({ time, altitude, azimuth });
  }

  return points;
}

/**
 * Determine if target is observable during astronomical twilight
 */
export function isObservableTonight(
  target: TargetCoordinates,
  location: ObserverLocation,
  date: Date = new Date()
): boolean {
  const visibility = getTargetVisibility(target, location, date);

  // Check if object is above minimum altitude during the night
  if (visibility.window.isNeverVisible) return false;
  if (visibility.window.isCircumpolar) return true;

  // Check if rise/set times overlap with night time
  // This is a simplified check - in production you'd want to check actual sunset/sunrise times
  return visibility.window.maxAltitude >= MIN_ALTITUDE;
}

/**
 * Get best observation time (when altitude is highest)
 */
export function getBestObservationTime(
  target: TargetCoordinates,
  location: ObserverLocation,
  date: Date = new Date()
): Date | null {
  const visibility = getTargetVisibility(target, location, date);
  return visibility.window.meridian;
}

/**
 * Format altitude/azimuth for display
 */
export function formatAltAz(altAz: AltitudeAzimuth): string {
  return `Alt: ${altAz.altitude.toFixed(1)}° Az: ${altAz.azimuth.toFixed(1)}°`;
}

/**
 * Get cardinal direction from azimuth
 */
export function getDirectionFromAzimuth(azimuth: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(azimuth / 22.5) % 16;
  return directions[index];
}

/**
 * Calculate moon position (altitude/azimuth) at a specific time
 */
export function calculateMoonPosition(
  location: ObserverLocation,
  date: Date = new Date()
): AltitudeAzimuth {
  const observer = new Astronomy.Observer(
    location.latitude,
    location.longitude,
    location.elevation || 0
  );

  // Get moon's equatorial coordinates (RA/Dec)
  const equator = Astronomy.Equator(Astronomy.Body.Moon, date, observer, true, true);

  // Convert to horizontal coordinates (altitude/azimuth)
  const horizontal = Astronomy.Horizon(date, observer, equator.ra, equator.dec, 'normal');

  return {
    altitude: horizontal.altitude,
    azimuth: horizontal.azimuth,
  };
}

/**
 * Calculate moon illumination (phase) - returns fraction illuminated (0-1)
 * 0 = new moon, 0.5 = first/last quarter, 1 = full moon
 */
export function calculateMoonIllumination(date: Date = new Date()): number {
  const illum = Astronomy.Illumination(Astronomy.Body.Moon, date);
  return illum.phase_fraction;
}

/**
 * Calculate moon magnitude based on current phase
 * Full moon: -12.7, New moon: not visible, Quarter: ~-10 to -11
 */
export function calculateMoonMagnitude(date: Date = new Date()): number {
  const illum = Astronomy.Illumination(Astronomy.Body.Moon, date);
  const phaseFraction = illum.phase_fraction;

  // Convert phase fraction to phase angle in degrees
  // phase_fraction = (1 + cos(phase_angle)) / 2
  // Therefore: phase_angle = acos(2 * phase_fraction - 1)
  const phaseAngleRad = Math.acos(2 * phaseFraction - 1);
  const phaseAngleDeg = (phaseAngleRad * 180) / Math.PI;

  // Standard formula for lunar magnitude based on phase angle
  // Reference: https://en.wikipedia.org/wiki/Apparent_magnitude#Planets_and_their_satellites
  const magnitude = -12.7 + 0.026 * Math.abs(phaseAngleDeg) + 4e-9 * Math.pow(phaseAngleDeg, 4);

  return magnitude;
}

/**
 * Calculate angular separation between two celestial coordinates
 * Returns separation in degrees
 */
export function calculateAngularSeparation(
  pos1: { raDeg: number; decDeg: number } | AltitudeAzimuth,
  pos2: { raDeg: number; decDeg: number } | AltitudeAzimuth
): number {
  // Check if we're using RA/Dec or Alt/Az
  if ('raDeg' in pos1 && 'raDeg' in pos2) {
    // RA/Dec coordinates - use spherical trigonometry
    const ra1 = (pos1.raDeg * Math.PI) / 180;
    const dec1 = (pos1.decDeg * Math.PI) / 180;
    const ra2 = (pos2.raDeg * Math.PI) / 180;
    const dec2 = (pos2.decDeg * Math.PI) / 180;

    // Haversine formula
    const dra = ra2 - ra1;
    const a =
      Math.sin((dec2 - dec1) / 2) ** 2 +
      Math.cos(dec1) * Math.cos(dec2) * Math.sin(dra / 2) ** 2;
    const separation = 2 * Math.asin(Math.sqrt(a));

    return (separation * 180) / Math.PI;
  } else if ('altitude' in pos1 && 'altitude' in pos2) {
    // Alt/Az coordinates
    const alt1 = (pos1.altitude * Math.PI) / 180;
    const az1 = (pos1.azimuth * Math.PI) / 180;
    const alt2 = (pos2.altitude * Math.PI) / 180;
    const az2 = (pos2.azimuth * Math.PI) / 180;

    // Haversine formula for alt/az
    const daz = az2 - az1;
    const a =
      Math.sin((alt2 - alt1) / 2) ** 2 +
      Math.cos(alt1) * Math.cos(alt2) * Math.sin(daz / 2) ** 2;
    const separation = 2 * Math.asin(Math.sqrt(a));

    return (separation * 180) / Math.PI;
  }

  return 0;
}

/**
 * Calculate moon altitude over time (for charting)
 */
export function calculateMoonAltitudeOverTime(
  location: ObserverLocation,
  startDate: Date,
  hours: number = 12,
  intervalMinutes: number = 30
): Array<{ time: Date; altitude: number; azimuth: number; illumination: number }> {
  const points: Array<{ time: Date; altitude: number; azimuth: number; illumination: number }> = [];
  const intervals = (hours * 60) / intervalMinutes;

  for (let i = 0; i <= intervals; i++) {
    const time = new Date(startDate.getTime() + i * intervalMinutes * 60 * 1000);
    const { altitude, azimuth } = calculateMoonPosition(location, time);
    const illumination = calculateMoonIllumination(time);

    points.push({ time, altitude, azimuth, illumination });
  }

  return points;
}

/**
 * Calculate sun altitude at a specific time (for twilight calculations)
 */
export function calculateSunPosition(
  location: ObserverLocation,
  date: Date = new Date()
): AltitudeAzimuth {
  const observer = new Astronomy.Observer(
    location.latitude,
    location.longitude,
    location.elevation || 0
  );

  // Get sun's equatorial coordinates
  const equator = Astronomy.Equator(Astronomy.Body.Sun, date, observer, true, true);

  // Convert to horizontal coordinates (altitude/azimuth)
  const horizontal = Astronomy.Horizon(date, observer, equator.ra, equator.dec, 'normal');

  return {
    altitude: horizontal.altitude,
    azimuth: horizontal.azimuth,
  };
}

/**
 * Calculate dynamic position for planets and Moon
 * Returns RA/Dec for a given solar system body at a specific time
 */
export function calculatePlanetPosition(
  solarSystemBody: string,
  date: Date = new Date()
): { raDeg: number; decDeg: number } {
  const bodyMap: Record<string, Astronomy.Body> = {
    'Mercury': Astronomy.Body.Mercury,
    'Venus': Astronomy.Body.Venus,
    'Mars': Astronomy.Body.Mars,
    'Jupiter': Astronomy.Body.Jupiter,
    'Saturn': Astronomy.Body.Saturn,
    'Uranus': Astronomy.Body.Uranus,
    'Neptune': Astronomy.Body.Neptune,
    'Moon': Astronomy.Body.Moon,
  };

  const body = bodyMap[solarSystemBody];
  if (!body) {
    console.error(`Unknown solar system body: ${solarSystemBody}`);
    return { raDeg: 0, decDeg: 0 };
  }

  // Get equatorial coordinates (RA/Dec) for the body
  const equator = Astronomy.EquatorFromVector(
    Astronomy.GeoVector(body, date, false)
  );

  // Convert RA from hours to degrees (15 degrees per hour)
  const raDeg = equator.ra * 15;
  const decDeg = equator.dec;

  return { raDeg, decDeg };
}

/**
 * Calculate sun altitude over time (for twilight charting)
 */
export function calculateSunAltitudeOverTime(
  location: ObserverLocation,
  startDate: Date,
  hours: number = 24,
  intervalMinutes: number = 30
): Array<{ time: Date; altitude: number }> {
  const points: Array<{ time: Date; altitude: number }> = [];
  const intervals = (hours * 60) / intervalMinutes;

  for (let i = 0; i <= intervals; i++) {
    const time = new Date(startDate.getTime() + i * intervalMinutes * 60 * 1000);
    const { altitude } = calculateSunPosition(location, time);

    points.push({ time, altitude });
  }

  return points;
}

/**
 * Determine safe separation distance from moon based on moon phase
 * Returns minimum safe distance in degrees
 */
export function getSafeMoonSeparation(illumination: number): number {
  // Full moon (>90% illuminated): need 40° separation
  if (illumination > 0.9) return 40;

  // Gibbous moon (70-90%): need 30° separation
  if (illumination > 0.7) return 30;

  // Quarter moon (40-70%): need 20° separation
  if (illumination > 0.4) return 20;

  // Crescent moon (10-40%): need 15° separation
  if (illumination > 0.1) return 15;

  // New moon (<10%): need 10° separation
  return 10;
}

/**
 * Check if moon interferes with target observation
 */
export function checkMoonInterference(
  targetPos: AltitudeAzimuth,
  moonPos: AltitudeAzimuth,
  moonIllumination: number
): { interferes: boolean; separation: number; safeDistance: number } {
  const separation = calculateAngularSeparation(targetPos, moonPos);
  const safeDistance = getSafeMoonSeparation(moonIllumination);

  return {
    interferes: separation < safeDistance && moonPos.altitude > 0,
    separation,
    safeDistance,
  };
}

/**
 * Parse RA string from COBS format (HH:MM:SS.SS) to decimal degrees
 */
function parseRAString(raStr: string): number {
  const parts = raStr.split(':');
  const hours = parseFloat(parts[0]);
  const minutes = parseFloat(parts[1]);
  const seconds = parseFloat(parts[2]);

  const decimalHours = hours + minutes / 60 + seconds / 3600;
  return decimalHours * 15; // Convert hours to degrees (15° per hour)
}

/**
 * Parse Dec string from COBS format (DD:MM:SS.S) to decimal degrees
 */
function parseDecString(decStr: string): number {
  const isNegative = decStr.startsWith('-');
  const parts = decStr.replace('-', '').split(':');
  const degrees = parseFloat(parts[0]);
  const minutes = parseFloat(parts[1]);
  const seconds = parseFloat(parts[2]);

  const decimalDegrees = degrees + minutes / 60 + seconds / 3600;
  return isNegative ? -decimalDegrees : decimalDegrees;
}

interface CobsCometPosition {
  name: string;
  fullname: string;
  raDeg: number;
  decDeg: number;
  magnitude: number;
  constellation: string;
}

/**
 * Fetch current comet positions from COBS planner API
 */
export async function fetchCometPositions(
  location: ObserverLocation,
  date: Date = new Date()
): Promise<Map<string, CobsCometPosition>> {
  const positions = new Map<string, CobsCometPosition>();

  try {
    // Format date as YYYY-MM-DD
    const dateStr = date.toISOString().split('T')[0];

    // COBS planner API requires location - use default if not provided
    const lat = location.latitude;
    const lon = location.longitude;

    // Fetch from COBS planner API
    // Note: This returns comets visible from the given location
    const url = `https://cobs.si/api/planner.api?date=${dateStr}&lat=${lat}&long=${lon}&mag=15`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`COBS API error: ${response.status}`);
      return positions;
    }

    const data = await response.json();

    // Parse comet list
    if (data.comet_list && Array.isArray(data.comet_list)) {
      for (const comet of data.comet_list) {
        try {
          const raDeg = parseRAString(comet.best_ra);
          const decDeg = parseDecString(comet.best_dec);

          positions.set(comet.comet_name, {
            name: comet.comet_name,
            fullname: comet.comet_fullname,
            raDeg,
            decDeg,
            magnitude: parseFloat(comet.magnitude),
            constellation: comet.constelation,
          });
        } catch (error) {
          console.error(`Error parsing comet ${comet.comet_name}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error fetching comet positions from COBS:', error);
  }

  return positions;
}

/**
 * Check if a target is well-visible on a given date
 * Returns visibility info: hours visible above 30° and max altitude
 */
export function checkTargetVisibilityOnDate(
  target: TargetCoordinates,
  location: ObserverLocation,
  date: Date
): { hoursAbove30: number; maxAltitude: number } {
  // Get sunset time (approximate: 6 PM local) and check for 12 hours
  const nightStart = new Date(date);
  nightStart.setHours(18, 0, 0, 0); // 6 PM

  const altitudeData = calculateAltitudeOverTime(target, location, nightStart, 12, 30);

  let hoursAbove30 = 0;
  let maxAltitude = -90;

  for (const point of altitudeData) {
    if (point.altitude > maxAltitude) {
      maxAltitude = point.altitude;
    }
    if (point.altitude >= 30) {
      hoursAbove30 += 0.5; // 30-minute intervals
    }
  }

  return { hoursAbove30, maxAltitude };
}

/**
 * Calculate the best date to observe a deep sky object
 * The best date is when the object culminates (reaches highest altitude) around midnight
 * This occurs when the object's RA is 12 hours away from the Sun's RA
 *
 * If the calculated best date is in the past but the target is still well-visible today
 * (6+ hours above 30° altitude), today's date is returned instead.
 *
 * @param target Target coordinates (RA/Dec)
 * @param referenceDate Optional reference date to search from (defaults to today)
 * @param location Optional observer location for visibility check
 * @returns The date when the target is best positioned for night observation
 */
export function calculateBestObservationDate(
  target: TargetCoordinates,
  referenceDate: Date = new Date(),
  location?: ObserverLocation
): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get the target's RA in hours
  const targetRAHours = target.raDeg / 15;

  // The Sun moves roughly 1 hour of RA per 15 days (or about 0.0667 hours per day)
  // To find when the target culminates at midnight, we need the Sun's RA to be
  // opposite to the target's RA (i.e., Sun's RA = target's RA - 12h or + 12h)

  // Get Sun's current position
  const sunEquator = Astronomy.Equator(Astronomy.Body.Sun, referenceDate, new Astronomy.Observer(0, 0, 0), true, true);
  const sunRAHours = sunEquator.ra;

  // Calculate the target's "opposition" RA (when Sun is 12h away, target is highest at midnight)
  // We want: sunRA = targetRA - 12 (or + 12, normalized to 0-24)
  let targetOppositionSunRA = targetRAHours - 12;
  if (targetOppositionSunRA < 0) targetOppositionSunRA += 24;

  // Calculate how many hours of RA the Sun needs to move to reach opposition point
  let raDistance = targetOppositionSunRA - sunRAHours;

  // Normalize to -12 to +12 hours (shortest path)
  if (raDistance > 12) raDistance -= 24;
  if (raDistance < -12) raDistance += 24;

  // Convert RA distance to days (Sun moves ~1° per day, 15° per hour of RA)
  // So 1 hour of RA ≈ 15.2 days
  const daysUntilBest = raDistance * 15.2;

  // Calculate the theoretical best date
  let bestDate = new Date(referenceDate);
  bestDate.setDate(bestDate.getDate() + Math.round(daysUntilBest));
  bestDate.setHours(0, 0, 0, 0);

  const daysDiff = (bestDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

  // If the best date is in the past or today, check visibility
  if (daysDiff <= 0) {
    if (location) {
      const todayVisibility = checkTargetVisibilityOnDate(target, location, today);

      // If target is visible for 6+ hours above 30° today, use today's date
      if (todayVisibility.hoursAbove30 >= 6 && todayVisibility.maxAltitude >= 30) {
        return today;
      }
    }

    // Target is not well-visible today, return next year's best date
    bestDate.setFullYear(bestDate.getFullYear() + 1);
    return bestDate;
  }

  // Best date is in the future - return it
  return bestDate;
}
