'use client';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Stack } from '@/components/ui/stack';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface FilterSizeIndicatorProps {
  sensorWidthMm: number;
  sensorHeightMm: number;
}

interface FilterSize {
  size: string;
  diameterMm: number;
  description: string;
}

// Standard filter sizes used in astrophotography
const FILTER_SIZES: FilterSize[] = [
  { size: '1.25"', diameterMm: 31.7, description: 'Standard eyepiece size, small sensors' },
  { size: '36mm', diameterMm: 36, description: 'M48 thread, DSLR and medium CMOS' },
  { size: '2"', diameterMm: 50.8, description: 'Large sensors, common for imaging' },
  { size: '50mm', diameterMm: 50, description: 'M54 thread, very large sensors' },
];

const calculateSensorDiagonal = (widthMm: number, heightMm: number): number => {
  return Math.sqrt(widthMm * widthMm + heightMm * heightMm);
};

const getRecommendedFilterSize = (sensorWidthMm: number, sensorHeightMm: number): FilterSize => {
  const diagonal = calculateSensorDiagonal(sensorWidthMm, sensorHeightMm);
  // Add 15% clearance to avoid vignetting
  const requiredDiameter = diagonal * 1.15;

  // Find the smallest filter size that fits
  const recommended =
    FILTER_SIZES.find((filter) => filter.diameterMm >= requiredDiameter) ||
    FILTER_SIZES[FILTER_SIZES.length - 1];

  return recommended;
};

export function FilterSizeIndicator({
  sensorWidthMm,
  sensorHeightMm,
}: FilterSizeIndicatorProps) {
  const diagonal = calculateSensorDiagonal(sensorWidthMm, sensorHeightMm);
  const recommendedFilter = getRecommendedFilterSize(sensorWidthMm, sensorHeightMm);

  return (
    <Box>
      <Text size="xs" className="font-medium mb-2 text-muted-foreground">
        Min. Filter Size
      </Text>

      <Tooltip>
        <TooltipTrigger asChild>
          <Box className="relative w-20 h-20">
            {/* Filter circle */}
            <Box
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60px] h-[60px] rounded-full border-[3px] border-primary shadow-[0_0_8px_rgba(34,139,230,0.3)]"
              style={{
                background: 'radial-gradient(circle, rgba(34, 139, 230, 0.1) 0%, rgba(34, 139, 230, 0.05) 100%)',
              }}
            />

            {/* Diameter arrow (horizontal) */}
            <Box className="absolute left-2.5 right-2.5 top-1/2 h-0.5 bg-muted-foreground/60">
              {/* Left arrow */}
              <Box
                className="absolute left-0 top-1/2 -translate-y-1/2 w-0 h-0 opacity-60"
                style={{
                  borderTop: '4px solid transparent',
                  borderBottom: '4px solid transparent',
                  borderRight: '6px solid hsl(var(--muted-foreground))',
                }}
              />
              {/* Right arrow */}
              <Box
                className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 opacity-60"
                style={{
                  borderTop: '4px solid transparent',
                  borderBottom: '4px solid transparent',
                  borderLeft: '6px solid hsl(var(--muted-foreground))',
                }}
              />
            </Box>

            {/* Diameter label */}
            <Box
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-muted-foreground text-center font-semibold"
            >
              ⌀
            </Box>
          </Box>
        </TooltipTrigger>
        <TooltipContent side="left" className="w-56">
          <Box>
            <Text size="xs">Sensor diagonal: {diagonal.toFixed(1)}mm</Text>
            <Text size="xs" className="mt-1">
              {recommendedFilter.description}
            </Text>
            <Text size="xs" className="text-muted-foreground mt-1">
              Recommendation includes 15% clearance to prevent vignetting
            </Text>
          </Box>
        </TooltipContent>
      </Tooltip>

      {/* Size label */}
      <Stack gap="xs" className="mt-1">
        <Text size="sm" className="text-center font-bold text-primary">
          {recommendedFilter.size}
        </Text>
        <Text size="xs" className="text-center text-muted-foreground text-[9px]">
          {recommendedFilter.diameterMm}mm
        </Text>
      </Stack>
    </Box>
  );
}
