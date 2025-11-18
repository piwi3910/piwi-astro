import * as Astronomy from 'astronomy-engine';

export interface ObserverLocation {
  latitude: number;
  longitude: number;
  elevation?: number; // meters above sea level
}

export interface TargetCoordinates {
  raDeg: number; // Right Ascension in degrees
  decDeg: number; // Declination in degrees
}

export interface AltitudeData {
  time: Date;
  altitude: number; // degrees above horizon
  azimuth: number; // degrees from north
  airmass: number;
}

export interface MoonData {
  altitude: number;
  azimuth: number;
  phase: number; // 0-1 (0 = new moon, 0.5 = full moon)
  illumination: number; // percentage 0-100
  distance: number; // angular distance from target in degrees
}

/**
 * Calculate altitude and azimuth for a target at a given time and location
 */
export function calculateAltitudeAzimuth(
  target: TargetCoordinates,
  observer: ObserverLocation,
  time: Date
): AltitudeData {
  const observerObj = new Astronomy.Observer(
    observer.latitude,
    observer.longitude,
    observer.elevation || 0
  );

  // Define a user star for the target coordinates
  // Using Star1 as a temporary star definition
  const raHours = target.raDeg / 15.0; // Convert degrees to hours
  Astronomy.DefineStar(Astronomy.Body.Star1, raHours, target.decDeg, 1000);

  // Get equatorial coordinates for the star
  const equ = Astronomy.Equator(Astronomy.Body.Star1, time, observerObj, true, true);

  // Get horizontal coordinates (altitude/azimuth)
  const horizontal = Astronomy.Horizon(time, observerObj, equ.ra, equ.dec);

  // Calculate airmass (sec(z) approximation for altitude > 10 degrees)
  const zenithAngle = 90 - horizontal.altitude;
  const airmass = horizontal.altitude > 10
    ? 1 / Math.cos((zenithAngle * Math.PI) / 180)
    : 999; // Very high airmass near horizon

  return {
    time,
    altitude: horizontal.altitude,
    azimuth: horizontal.azimuth,
    airmass,
  };
}

/**
 * Calculate altitude data for a target over a night
 */
export function calculateNightVisibility(
  target: TargetCoordinates,
  observer: ObserverLocation,
  date: Date,
  intervalMinutes: number = 30
): AltitudeData[] {
  const data: AltitudeData[] = [];

  // Calculate sunset and sunrise times
  const observerObj = new Astronomy.Observer(
    observer.latitude,
    observer.longitude,
    observer.elevation || 0
  );

  const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observerObj, -1, date, 1);
  const sunrise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observerObj, 1, date, 1);

  if (!sunset || !sunrise) {
    return data;
  }

  // Generate data points from sunset to sunrise
  let currentTime = sunset.date;
  const endTime = sunrise.date;

  while (currentTime <= endTime) {
    const altAz = calculateAltitudeAzimuth(target, observer, currentTime);
    data.push(altAz);
    currentTime = new Date(currentTime.getTime() + intervalMinutes * 60 * 1000);
  }

  return data;
}

/**
 * Calculate meridian transit time (when target is highest in sky)
 */
export function calculateMeridianTransit(
  target: TargetCoordinates,
  observer: ObserverLocation,
  date: Date
): { time: Date; altitude: number } | null {
  const nightData = calculateNightVisibility(target, observer, date, 10);

  if (nightData.length === 0) {
    return null;
  }

  // Find the highest altitude point
  const transit = nightData.reduce((max, current) =>
    current.altitude > max.altitude ? current : max
  );

  return {
    time: transit.time,
    altitude: transit.altitude,
  };
}

/**
 * Calculate moon position and phase
 */
export function calculateMoonData(
  observer: ObserverLocation,
  time: Date,
  targetAltAz?: { altitude: number; azimuth: number }
): MoonData {
  const observerObj = new Astronomy.Observer(
    observer.latitude,
    observer.longitude,
    observer.elevation || 0
  );

  // Get moon equatorial coordinates
  const moonEqu = Astronomy.Equator(Astronomy.Body.Moon, time, observerObj, true, true);

  // Get moon horizontal coordinates
  const moonHor = Astronomy.Horizon(time, observerObj, moonEqu.ra, moonEqu.dec);

  // Get moon illumination (phase)
  const illumination = Astronomy.Illumination(Astronomy.Body.Moon, time);

  // Calculate angular distance from target if provided
  let distance = 0;
  if (targetAltAz) {
    const dAlt = moonHor.altitude - targetAltAz.altitude;
    const dAz = moonHor.azimuth - targetAltAz.azimuth;
    distance = Math.sqrt(dAlt * dAlt + dAz * dAz);
  }

  // Moon phase (0-1, where 0 = new moon, 0.5 = full moon)
  // Phase is calculated from phase angle: 0° = full, 180° = new
  const phase = (1 - Math.cos((illumination.phase_angle * Math.PI) / 180)) / 2;

  return {
    altitude: moonHor.altitude,
    azimuth: moonHor.azimuth,
    phase,
    illumination: illumination.phase_fraction * 100,
    distance,
  };
}

/**
 * Check if target is observable (above horizon and not too close to moon)
 */
export interface ObservabilityCheck {
  isVisible: boolean; // Above horizon
  isMoonSafe: boolean; // More than 30° from moon
  altitude: number;
  moonDistance: number;
  moonIllumination: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor'; // Based on altitude and moon
}

export function checkObservability(
  target: TargetCoordinates,
  observer: ObserverLocation,
  time: Date
): ObservabilityCheck {
  const altAz = calculateAltitudeAzimuth(target, observer, time);
  const moonData = calculateMoonData(observer, time, altAz);

  const isVisible = altAz.altitude > 0;
  const isMoonSafe = moonData.distance > 30 || moonData.altitude < 0; // 30° separation or moon below horizon

  // Determine quality
  let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';

  if (isVisible && isMoonSafe) {
    if (altAz.altitude > 60 && moonData.illumination < 50) {
      quality = 'excellent';
    } else if (altAz.altitude > 45) {
      quality = 'good';
    } else if (altAz.altitude > 30) {
      quality = 'fair';
    }
  }

  return {
    isVisible,
    isMoonSafe,
    altitude: altAz.altitude,
    moonDistance: moonData.distance,
    moonIllumination: moonData.illumination,
    quality,
  };
}

/**
 * Get best observation times for a target on a given night
 */
export interface BestObservationWindow {
  start: Date;
  end: Date;
  peakTime: Date;
  peakAltitude: number;
  averageQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export function findBestObservationWindows(
  target: TargetCoordinates,
  observer: ObserverLocation,
  date: Date
): BestObservationWindow[] {
  const nightData = calculateNightVisibility(target, observer, date, 15);
  const windows: BestObservationWindow[] = [];

  let windowStart: Date | null = null;
  let windowData: AltitudeData[] = [];

  for (const data of nightData) {
    const observability = checkObservability(target, observer, data.time);

    if (observability.isVisible && observability.altitude > 30) {
      if (!windowStart) {
        windowStart = data.time;
      }
      windowData.push(data);
    } else {
      if (windowStart && windowData.length > 0) {
        // End of window - calculate peak
        const peak = windowData.reduce((max, current) =>
          current.altitude > max.altitude ? current : max
        );

        // Calculate average quality
        const qualities = windowData.map(d =>
          checkObservability(target, observer, d.time).quality
        );
        const qualityScores = { excellent: 4, good: 3, fair: 2, poor: 1 };
        const avgScore = qualities.reduce((sum, q) => sum + qualityScores[q], 0) / qualities.length;
        const averageQuality: 'excellent' | 'good' | 'fair' | 'poor' =
          avgScore >= 3.5 ? 'excellent' : avgScore >= 2.5 ? 'good' : avgScore >= 1.5 ? 'fair' : 'poor';

        windows.push({
          start: windowStart,
          end: data.time,
          peakTime: peak.time,
          peakAltitude: peak.altitude,
          averageQuality,
        });

        windowStart = null;
        windowData = [];
      }
    }
  }

  return windows;
}
