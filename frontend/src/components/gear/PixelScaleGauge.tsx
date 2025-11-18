'use client';

import { Box, Text, Stack, Tooltip } from '@mantine/core';

interface PixelScaleGaugeProps {
  pixelScale: number;
}

interface Zone {
  min: number;
  max: number;
  color: string;
  label: string;
  description: string;
}

// Pixel scale zones based on astrophotography best practices
// Optimal sampling for typical seeing conditions (2-3 arcsec FWHM)
const ZONES: Zone[] = [
  {
    min: 0,
    max: 0.3,
    color: '#fa5252', // red
    label: 'Oversampled',
    description: 'Too fine - limited by atmospheric seeing',
  },
  {
    min: 0.3,
    max: 0.5,
    color: '#fd7e14', // orange
    label: 'Heavy Oversampling',
    description: 'Excessive sampling for typical seeing',
  },
  {
    min: 0.5,
    max: 1.0,
    color: '#51cf66', // green
    label: 'Excellent',
    description: 'Optimal Nyquist sampling',
  },
  {
    min: 1.0,
    max: 2.0,
    color: '#94d82d', // lime
    label: 'Good',
    description: 'Good sampling for most targets',
  },
  {
    min: 2.0,
    max: 3.0,
    color: '#ffd43b', // yellow
    label: 'Marginal',
    description: 'Undersampled - acceptable for large targets',
  },
  {
    min: 3.0,
    max: 4.0,
    color: '#fd7e14', // orange
    label: 'Poor',
    description: 'Significantly undersampled',
  },
  {
    min: 4.0,
    max: 10,
    color: '#fa5252', // red
    label: 'Bad',
    description: 'Severely undersampled - low resolution',
  },
];

const getZoneForPixelScale = (pixelScale: number): Zone => {
  return (
    ZONES.find((zone) => pixelScale >= zone.min && pixelScale < zone.max) ||
    ZONES[ZONES.length - 1]
  );
};

const getMarkerPosition = (pixelScale: number): number => {
  // Map pixel scale to position (0-100%)
  // Using logarithmic scale for better visual distribution
  const minScale = 0.2;
  const maxScale = 5.0;

  const clampedScale = Math.max(minScale, Math.min(maxScale, pixelScale));
  const logMin = Math.log(minScale);
  const logMax = Math.log(maxScale);
  const logScale = Math.log(clampedScale);

  return ((logScale - logMin) / (logMax - logMin)) * 100;
};

export function PixelScaleGauge({ pixelScale }: PixelScaleGaugeProps): JSX.Element {
  const currentZone = getZoneForPixelScale(pixelScale);
  const markerPosition = getMarkerPosition(pixelScale);

  return (
    <Box>
      <Text size="xs" fw={500} mb={4} c="dimmed">
        Pixel Scale Quality
      </Text>

      <Tooltip
        label={`${currentZone.label}: ${currentZone.description}`}
        position="left"
        withArrow
      >
        <Box style={{ position: 'relative', height: 120, width: 40 }}>
          {/* Gradient bar */}
          <Box
            style={{
              position: 'absolute',
              left: 12,
              width: 16,
              height: '100%',
              borderRadius: 8,
              background: `linear-gradient(to bottom,
                #fa5252 0%,
                #fd7e14 7%,
                #94d82d 15%,
                #51cf66 30%,
                #94d82d 50%,
                #ffd43b 70%,
                #fd7e14 85%,
                #fa5252 100%
              )`,
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          />

          {/* Current value marker */}
          <Box
            style={{
              position: 'absolute',
              top: `${100 - markerPosition}%`,
              left: 0,
              transform: 'translateY(-50%)',
              width: 40,
              height: 3,
              backgroundColor: 'white',
              borderRadius: 2,
              boxShadow: '0 0 4px rgba(0, 0, 0, 0.5)',
              zIndex: 10,
            }}
          />

          {/* Scale labels */}
          <Box
            style={{
              position: 'absolute',
              right: -8,
              top: 0,
              fontSize: 9,
              color: 'var(--mantine-color-dimmed)',
            }}
          >
            0.3
          </Box>
          <Box
            style={{
              position: 'absolute',
              right: -8,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 9,
              color: 'var(--mantine-color-dimmed)',
            }}
          >
            1.5
          </Box>
          <Box
            style={{
              position: 'absolute',
              right: -8,
              bottom: 0,
              fontSize: 9,
              color: 'var(--mantine-color-dimmed)',
            }}
          >
            4.0
          </Box>
        </Box>
      </Tooltip>

      {/* Current value display */}
      <Stack gap={2} mt={8}>
        <Text size="xs" ta="center" fw={700} c={currentZone.color}>
          {pixelScale.toFixed(2)}″/px
        </Text>
        <Text size="xs" ta="center" c="dimmed" style={{ fontSize: 9 }}>
          {currentZone.label}
        </Text>
      </Stack>
    </Box>
  );
}
