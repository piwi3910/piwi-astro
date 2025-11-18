import type { FOVCalculation } from '../types';

/**
 * Calculate Field of View and pixel scale for a telescope/camera rig
 *
 * @param focalLengthMm - Telescope focal length in millimeters
 * @param sensorWidthMm - Camera sensor width in millimeters
 * @param sensorHeightMm - Camera sensor height in millimeters
 * @param pixelSizeUm - Pixel size in micrometers
 * @param reducerFactor - Focal reducer factor (e.g., 0.7 for 0.7x reducer)
 * @param barlowFactor - Barlow lens factor (e.g., 2.0 for 2x barlow)
 * @returns FOV calculation results
 */
export function calculateFOV(
  focalLengthMm: number,
  sensorWidthMm: number,
  sensorHeightMm: number,
  pixelSizeUm: number,
  reducerFactor: number = 1.0,
  barlowFactor: number = 1.0
): FOVCalculation {
  // Effective focal length accounting for reducer/barlow
  const effectiveFocalLength = focalLengthMm * reducerFactor * barlowFactor;

  // Pixel scale: arcsec/pixel = 206.265 * (pixel_size_µm / focal_length_mm)
  const pixelScaleArcsecPerPixel = 206.265 * (pixelSizeUm / effectiveFocalLength);

  // FOV in radians: (sensor_mm / focal_length_mm)
  // Convert to degrees: * (180 / π)
  // Convert to arcminutes: * 60
  const fovWidthDeg = (sensorWidthMm / effectiveFocalLength) * (180 / Math.PI);
  const fovHeightDeg = (sensorHeightMm / effectiveFocalLength) * (180 / Math.PI);

  const fovWidthArcmin = fovWidthDeg * 60;
  const fovHeightArcmin = fovHeightDeg * 60;

  return {
    fovWidthArcmin,
    fovHeightArcmin,
    pixelScaleArcsecPerPixel,
  };
}
