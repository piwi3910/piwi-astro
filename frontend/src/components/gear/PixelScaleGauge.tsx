'use client';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Stack } from '@/components/ui/stack';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

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

export function PixelScaleGauge({ pixelScale }: PixelScaleGaugeProps) {
  const currentZone = getZoneForPixelScale(pixelScale);
  const markerPosition = getMarkerPosition(pixelScale);

  return (
    <Box>
      <Text size="xs" className="font-medium mb-1 text-muted-foreground">
        Pixel Scale Quality
      </Text>

      <Tooltip>
        <TooltipTrigger asChild>
          <Box className="relative h-[120px] w-10">
            {/* Gradient bar */}
            <Box
              className="absolute left-3 w-4 h-full rounded-lg border border-white/10"
              style={{
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
              }}
            />

            {/* Current value marker */}
            <Box
              className="absolute left-0 w-10 h-0.5 bg-white rounded-sm shadow-[0_0_4px_rgba(0,0,0,0.5)] z-10"
              style={{
                top: `${100 - markerPosition}%`,
                transform: 'translateY(-50%)',
              }}
            />

            {/* Scale labels */}
            <Box
              className="absolute -right-2 top-0 text-[9px] text-muted-foreground"
            >
              0.3
            </Box>
            <Box
              className="absolute -right-2 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground"
            >
              1.5
            </Box>
            <Box
              className="absolute -right-2 bottom-0 text-[9px] text-muted-foreground"
            >
              4.0
            </Box>
          </Box>
        </TooltipTrigger>
        <TooltipContent side="left">
          <Text size="xs">{currentZone.label}: {currentZone.description}</Text>
        </TooltipContent>
      </Tooltip>

      {/* Current value display */}
      <Stack gap="xs" className="mt-2">
        <Text size="xs" className="text-center font-bold" style={{ color: currentZone.color }}>
          {pixelScale.toFixed(2)}″/px
        </Text>
        <Text size="xs" className="text-center text-muted-foreground text-[9px]">
          {currentZone.label}
        </Text>
      </Stack>
    </Box>
  );
}
