'use client';

import { Box, Text, Stack, Tooltip } from '@mantine/core';

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
}: FilterSizeIndicatorProps): JSX.Element {
  const diagonal = calculateSensorDiagonal(sensorWidthMm, sensorHeightMm);
  const recommendedFilter = getRecommendedFilterSize(sensorWidthMm, sensorHeightMm);

  return (
    <Box>
      <Text size="xs" fw={500} mb={8} c="dimmed">
        Min. Filter Size
      </Text>

      <Tooltip
        label={
          <Box>
            <Text size="xs">Sensor diagonal: {diagonal.toFixed(1)}mm</Text>
            <Text size="xs" mt={4}>
              {recommendedFilter.description}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Recommendation includes 15% clearance to prevent vignetting
            </Text>
          </Box>
        }
        position="left"
        withArrow
        multiline
        w={220}
      >
        <Box style={{ position: 'relative', width: 80, height: 80 }}>
          {/* Filter circle */}
          <Box
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 60,
              height: 60,
              borderRadius: '50%',
              border: '3px solid var(--mantine-color-blue-5)',
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
              boxShadow: '0 0 8px rgba(59, 130, 246, 0.3)',
            }}
          />

          {/* Diameter arrow (horizontal) */}
          <Box
            style={{
              position: 'absolute',
              left: 10,
              right: 10,
              top: '50%',
              height: 2,
              background: 'var(--mantine-color-dimmed)',
              opacity: 0.6,
            }}
          >
            {/* Left arrow */}
            <Box
              style={{
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 0,
                height: 0,
                borderTop: '4px solid transparent',
                borderBottom: '4px solid transparent',
                borderRight: '6px solid var(--mantine-color-dimmed)',
                opacity: 0.6,
              }}
            />
            {/* Right arrow */}
            <Box
              style={{
                position: 'absolute',
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 0,
                height: 0,
                borderTop: '4px solid transparent',
                borderBottom: '4px solid transparent',
                borderLeft: '6px solid var(--mantine-color-dimmed)',
                opacity: 0.6,
              }}
            />
          </Box>

          {/* Diameter label */}
          <Box
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 10,
              color: 'var(--mantine-color-dimmed)',
              textAlign: 'center',
              fontWeight: 600,
            }}
          >
            ⌀
          </Box>
        </Box>
      </Tooltip>

      {/* Size label */}
      <Stack gap={2} mt={4}>
        <Text size="sm" ta="center" fw={700} c="blue.5">
          {recommendedFilter.size}
        </Text>
        <Text size="xs" ta="center" c="dimmed" style={{ fontSize: 9 }}>
          {recommendedFilter.diameterMm}mm
        </Text>
      </Stack>
    </Box>
  );
}
