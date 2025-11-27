'use client';

import { useState, useMemo } from 'react';
import { Container } from '@/components/ui/container';
import { Title } from '@/components/ui/title';
import { Stack } from '@/components/ui/stack';
import { Group } from '@/components/ui/group';
import { SelectField } from '@/components/ui/select-field';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Grid, GridCol } from '@/components/ui/grid';
import { NumberInput } from '@/components/ui/number-input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Box } from '@/components/ui/box';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  useTelescopeBrands,
  useTelescopesByBrand,
  useCameraBrands,
  useCamerasByBrand,
} from '@/hooks/useGear';
import { calculateFOV } from '@/utils/fov';

// Pixel scale zones based on astrophotography best practices
interface Zone {
  min: number;
  max: number;
  color: string;
  label: string;
  description: string;
}

const ZONES: Zone[] = [
  {
    min: 0,
    max: 0.3,
    color: '#fa5252',
    label: 'Oversampled',
    description: 'Too fine - limited by atmospheric seeing. Only useful for planetary imaging with exceptional seeing.',
  },
  {
    min: 0.3,
    max: 0.5,
    color: '#fd7e14',
    label: 'Heavy Oversampling',
    description: 'Excessive sampling for typical conditions. Good for excellent seeing or small planetary details.',
  },
  {
    min: 0.5,
    max: 1.0,
    color: '#51cf66',
    label: 'Excellent',
    description: 'Optimal Nyquist sampling. Perfect for high-resolution deep sky imaging in good seeing.',
  },
  {
    min: 1.0,
    max: 2.0,
    color: '#94d82d',
    label: 'Good',
    description: 'Good sampling for most deep sky targets. Excellent balance of resolution and signal.',
  },
  {
    min: 2.0,
    max: 3.0,
    color: '#ffd43b',
    label: 'Marginal',
    description: 'Undersampled but acceptable for large targets like nebulae. Faster imaging with more signal per pixel.',
  },
  {
    min: 3.0,
    max: 4.0,
    color: '#fd7e14',
    label: 'Poor',
    description: 'Significantly undersampled. Only suitable for very wide field or bright targets.',
  },
  {
    min: 4.0,
    max: 10,
    color: '#fa5252',
    label: 'Bad',
    description: 'Severely undersampled - low resolution. Consider longer focal length or smaller pixels.',
  },
];

// Filter sizes
interface FilterSize {
  size: string;
  diameterMm: number;
  description: string;
}

const FILTER_SIZES: FilterSize[] = [
  { size: '1.25"', diameterMm: 31.7, description: 'Standard eyepiece size, small sensors' },
  { size: '36mm', diameterMm: 36, description: 'M48 thread, DSLR and medium CMOS' },
  { size: '2"', diameterMm: 50.8, description: 'Large sensors, common for imaging' },
  { size: '50mm', diameterMm: 50, description: 'M54 thread, very large sensors' },
];

const getZoneForPixelScale = (pixelScale: number): Zone => {
  return (
    ZONES.find((zone) => pixelScale >= zone.min && pixelScale < zone.max) ||
    ZONES[ZONES.length - 1]
  );
};

const calculateSensorDiagonal = (widthMm: number, heightMm: number): number => {
  return Math.sqrt(widthMm * widthMm + heightMm * heightMm);
};

const getRecommendedFilterSize = (sensorWidthMm: number, sensorHeightMm: number): FilterSize => {
  const diagonal = calculateSensorDiagonal(sensorWidthMm, sensorHeightMm);
  const requiredDiameter = diagonal * 1.15; // 15% clearance
  return (
    FILTER_SIZES.find((filter) => filter.diameterMm >= requiredDiameter) ||
    FILTER_SIZES[FILTER_SIZES.length - 1]
  );
};

const getMarkerPosition = (pixelScale: number): number => {
  const minScale = 0.2;
  const maxScale = 5.0;
  const clampedScale = Math.max(minScale, Math.min(maxScale, pixelScale));
  const logMin = Math.log(minScale);
  const logMax = Math.log(maxScale);
  const logScale = Math.log(clampedScale);
  return ((logScale - logMin) / (logMax - logMin)) * 100;
};

type SelectionMode = 'catalog' | 'custom';

export default function PixelScaleCalculatorPage() {
  // Selection mode
  const [telescopeMode, setTelescopeMode] = useState<SelectionMode>('catalog');
  const [cameraMode, setCameraMode] = useState<SelectionMode>('catalog');

  // Catalog selection state
  const [selectedTelescopeBrand, setSelectedTelescopeBrand] = useState<string | null>(null);
  const [selectedTelescopeModelId, setSelectedTelescopeModelId] = useState<string | null>(null);
  const [selectedCameraBrand, setSelectedCameraBrand] = useState<string | null>(null);
  const [selectedCameraModelId, setSelectedCameraModelId] = useState<string | null>(null);

  // Custom telescope values
  const [customFocalLength, setCustomFocalLength] = useState<number>(1000);
  const [customAperture, setCustomAperture] = useState<number>(100);

  // Custom camera values
  const [customSensorWidth, setCustomSensorWidth] = useState<number>(23.5);
  const [customSensorHeight, setCustomSensorHeight] = useState<number>(15.6);
  const [customPixelSize, setCustomPixelSize] = useState<number>(3.76);
  const [customResolutionX, setCustomResolutionX] = useState<number>(6000);
  const [_customResolutionY, _setCustomResolutionY] = useState<number>(4000);

  // Optical modifiers
  const [reducerFactor, setReducerFactor] = useState<number>(1.0);
  const [barlowFactor, setBarlowFactor] = useState<number>(1.0);

  // Fetch catalog data
  const { data: telescopeBrandsData } = useTelescopeBrands();
  const { data: telescopeModelsData } = useTelescopesByBrand(selectedTelescopeBrand);
  const { data: cameraBrandsData } = useCameraBrands();
  const { data: cameraModelsData } = useCamerasByBrand(selectedCameraBrand);

  const telescopeBrands = useMemo(() => telescopeBrandsData?.brands || [], [telescopeBrandsData]);
  const telescopeModels = useMemo(() => telescopeModelsData?.telescopes || [], [telescopeModelsData]);
  const cameraBrands = useMemo(() => cameraBrandsData?.brands || [], [cameraBrandsData]);
  const cameraModels = useMemo(() => cameraModelsData?.cameras || [], [cameraModelsData]);

  // Get selected telescope from catalog
  const selectedTelescope = useMemo(() => {
    if (telescopeMode !== 'catalog' || !selectedTelescopeModelId) return null;
    return telescopeModels.find((t) => t.id === selectedTelescopeModelId) || null;
  }, [telescopeMode, selectedTelescopeModelId, telescopeModels]);

  // Get selected camera from catalog
  const selectedCamera = useMemo(() => {
    if (cameraMode !== 'catalog' || !selectedCameraModelId) return null;
    return cameraModels.find((c) => c.id === selectedCameraModelId) || null;
  }, [cameraMode, selectedCameraModelId, cameraModels]);

  // Get effective telescope values
  const telescopeValues = useMemo(() => {
    if (telescopeMode === 'catalog' && selectedTelescope) {
      return {
        focalLength: selectedTelescope.focalLengthMm,
        aperture: selectedTelescope.apertureMm,
        name: `${selectedTelescope.brand} ${selectedTelescope.model}`,
      };
    }
    if (telescopeMode === 'custom') {
      return {
        focalLength: customFocalLength,
        aperture: customAperture,
        name: 'Custom Telescope',
      };
    }
    return null;
  }, [telescopeMode, selectedTelescope, customFocalLength, customAperture]);

  // Get effective camera values
  const cameraValues = useMemo(() => {
    if (cameraMode === 'catalog' && selectedCamera) {
      return {
        sensorWidth: selectedCamera.sensorWidthMm,
        sensorHeight: selectedCamera.sensorHeightMm,
        pixelSize: selectedCamera.pixelSizeUm,
        name: `${selectedCamera.brand} ${selectedCamera.model}`,
      };
    }
    if (cameraMode === 'custom') {
      return {
        sensorWidth: customSensorWidth,
        sensorHeight: customSensorHeight,
        pixelSize: customPixelSize,
        name: 'Custom Camera',
      };
    }
    return null;
  }, [cameraMode, selectedCamera, customSensorWidth, customSensorHeight, customPixelSize]);

  // Calculate results
  const calculationResults = useMemo(() => {
    if (!telescopeValues || !cameraValues) return null;

    const fov = calculateFOV(
      telescopeValues.focalLength,
      cameraValues.sensorWidth,
      cameraValues.sensorHeight,
      cameraValues.pixelSize,
      reducerFactor,
      barlowFactor
    );

    const effectiveFocalLength = telescopeValues.focalLength * reducerFactor * barlowFactor;
    const effectiveFocalRatio = effectiveFocalLength / telescopeValues.aperture;
    const zone = getZoneForPixelScale(fov.pixelScaleArcsecPerPixel);
    const sensorDiagonal = calculateSensorDiagonal(cameraValues.sensorWidth, cameraValues.sensorHeight);
    const recommendedFilter = getRecommendedFilterSize(cameraValues.sensorWidth, cameraValues.sensorHeight);
    const markerPosition = getMarkerPosition(fov.pixelScaleArcsecPerPixel);

    return {
      pixelScale: fov.pixelScaleArcsecPerPixel,
      fovWidth: fov.fovWidthArcmin,
      fovHeight: fov.fovHeightArcmin,
      effectiveFocalLength,
      effectiveFocalRatio,
      zone,
      sensorDiagonal,
      recommendedFilter,
      markerPosition,
    };
  }, [telescopeValues, cameraValues, reducerFactor, barlowFactor]);

  return (
    <Container size="xl" className="py-8">
      <Stack gap="lg">
        <Title order={1}>Pixel Scale Calculator</Title>
        <Text c="dimmed">
          Calculate pixel scale, FOV, and minimum filter size for any telescope and camera combination.
        </Text>

        <Grid>
          {/* Telescope Selection */}
          <GridCol span={{ base: 12, md: 6 }}>
            <Card className="h-full">
              <CardContent className="p-4">
                <Group justify="between" className="mb-4">
                  <Text fw="semibold">Telescope</Text>
                  <SegmentedControl
                    size="xs"
                    value={telescopeMode}
                    onChange={(v) => setTelescopeMode(v as SelectionMode)}
                    data={[
                      { value: 'catalog', label: 'Catalog' },
                      { value: 'custom', label: 'Custom' },
                    ]}
                  />
                </Group>

                {telescopeMode === 'catalog' ? (
                  <Grid gap="sm">
                    <GridCol span={6}>
                      <SelectField
                        label="Brand"
                        placeholder="Select brand"
                        data={telescopeBrands.map((b) => ({ value: b, label: b }))}
                        value={selectedTelescopeBrand || undefined}
                        onChange={(value) => {
                          setSelectedTelescopeBrand(value);
                          setSelectedTelescopeModelId(null);
                        }}
                      />
                    </GridCol>
                    <GridCol span={6}>
                      <SelectField
                        label="Model"
                        placeholder={selectedTelescopeBrand ? 'Select model' : 'Select brand first'}
                        data={telescopeModels.map((t) => ({
                          value: t.id,
                          label: `${t.model} (${t.focalLengthMm}mm f/${t.focalRatio.toFixed(1)})`,
                        }))}
                        value={selectedTelescopeModelId || undefined}
                        onChange={(value) => setSelectedTelescopeModelId(value)}
                        disabled={!selectedTelescopeBrand}
                      />
                    </GridCol>
                    {selectedTelescope && (
                      <GridCol span={12}>
                        <Card className="p-3 bg-card">
                          <Group gap="lg">
                            <Text size="xs">
                              <Text as="span" c="dimmed">Focal Length: </Text>
                              {selectedTelescope.focalLengthMm}mm
                            </Text>
                            <Text size="xs">
                              <Text as="span" c="dimmed">Aperture: </Text>
                              {selectedTelescope.apertureMm}mm
                            </Text>
                            <Text size="xs">
                              <Text as="span" c="dimmed">f/</Text>
                              {selectedTelescope.focalRatio.toFixed(1)}
                            </Text>
                          </Group>
                        </Card>
                      </GridCol>
                    )}
                  </Grid>
                ) : (
                  <Grid gap="sm">
                    <GridCol span={6}>
                      <NumberInput
                        label="Focal Length (mm)"
                        value={customFocalLength}
                        onChange={(val) => setCustomFocalLength(Number(val) || 1000)}
                        min={50}
                        max={10000}
                        step={50}
                      />
                    </GridCol>
                    <GridCol span={6}>
                      <NumberInput
                        label="Aperture (mm)"
                        value={customAperture}
                        onChange={(val) => setCustomAperture(Number(val) || 100)}
                        min={20}
                        max={1000}
                        step={10}
                      />
                    </GridCol>
                    <GridCol span={12}>
                      <Card className="p-3 bg-card">
                        <Text size="xs">
                          <Text as="span" c="dimmed">Focal Ratio: </Text>
                          f/{(customFocalLength / customAperture).toFixed(1)}
                        </Text>
                      </Card>
                    </GridCol>
                  </Grid>
                )}
              </CardContent>
            </Card>
          </GridCol>

          {/* Camera Selection */}
          <GridCol span={{ base: 12, md: 6 }}>
            <Card className="h-full">
              <CardContent className="p-4">
                <Group justify="between" className="mb-4">
                  <Text fw="semibold">Camera</Text>
                  <SegmentedControl
                    size="xs"
                    value={cameraMode}
                    onChange={(v) => setCameraMode(v as SelectionMode)}
                    data={[
                      { value: 'catalog', label: 'Catalog' },
                      { value: 'custom', label: 'Custom' },
                    ]}
                  />
                </Group>

                {cameraMode === 'catalog' ? (
                  <Grid gap="sm">
                    <GridCol span={6}>
                      <SelectField
                        label="Brand"
                        placeholder="Select brand"
                        data={cameraBrands.map((b) => ({ value: b, label: b }))}
                        value={selectedCameraBrand || undefined}
                        onChange={(value) => {
                          setSelectedCameraBrand(value);
                          setSelectedCameraModelId(null);
                        }}
                      />
                    </GridCol>
                    <GridCol span={6}>
                      <SelectField
                        label="Model"
                        placeholder={selectedCameraBrand ? 'Select model' : 'Select brand first'}
                        data={cameraModels.map((c) => ({
                          value: c.id,
                          label: `${c.model} (${c.pixelSizeUm}µm)`,
                        }))}
                        value={selectedCameraModelId || undefined}
                        onChange={(value) => setSelectedCameraModelId(value)}
                        disabled={!selectedCameraBrand}
                      />
                    </GridCol>
                    {selectedCamera && (
                      <GridCol span={12}>
                        <Card className="p-3 bg-card">
                          <Group gap="lg">
                            <Text size="xs">
                              <Text as="span" c="dimmed">Sensor: </Text>
                              {selectedCamera.sensorWidthMm.toFixed(1)} × {selectedCamera.sensorHeightMm.toFixed(1)}mm
                            </Text>
                            <Text size="xs">
                              <Text as="span" c="dimmed">Pixel: </Text>
                              {selectedCamera.pixelSizeUm}µm
                            </Text>
                          </Group>
                        </Card>
                      </GridCol>
                    )}
                  </Grid>
                ) : (
                  <Grid gap="sm">
                    <GridCol span={6}>
                      <NumberInput
                        label="Sensor Width (mm)"
                        value={customSensorWidth}
                        onChange={(val) => setCustomSensorWidth(Number(val) || 23.5)}
                        min={1}
                        max={100}
                        step={0.1}
                        precision={2}
                      />
                    </GridCol>
                    <GridCol span={6}>
                      <NumberInput
                        label="Sensor Height (mm)"
                        value={customSensorHeight}
                        onChange={(val) => setCustomSensorHeight(Number(val) || 15.6)}
                        min={1}
                        max={100}
                        step={0.1}
                        precision={2}
                      />
                    </GridCol>
                    <GridCol span={6}>
                      <NumberInput
                        label="Pixel Size (µm)"
                        value={customPixelSize}
                        onChange={(val) => setCustomPixelSize(Number(val) || 3.76)}
                        min={0.5}
                        max={20}
                        step={0.1}
                        precision={2}
                      />
                    </GridCol>
                    <GridCol span={6}>
                      <NumberInput
                        label="Resolution X (px)"
                        value={customResolutionX}
                        onChange={(val) => setCustomResolutionX(Number(val) || 6000)}
                        min={100}
                        max={100000}
                        step={100}
                      />
                    </GridCol>
                  </Grid>
                )}
              </CardContent>
            </Card>
          </GridCol>

          {/* Optical Modifiers */}
          <GridCol span={12}>
            <Card>
              <CardContent className="p-4">
                <Text fw="semibold" className="mb-4">Optical Modifiers</Text>
                <Grid gap="sm">
                  <GridCol span={{ base: 6, md: 3 }}>
                    <NumberInput
                      label="Focal Reducer"
                      description="e.g., 0.7 for 0.7x"
                      value={reducerFactor}
                      onChange={(val) => setReducerFactor(Number(val) || 1.0)}
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      precision={2}
                    />
                  </GridCol>
                  <GridCol span={{ base: 6, md: 3 }}>
                    <NumberInput
                      label="Barlow Lens"
                      description="e.g., 2.0 for 2x"
                      value={barlowFactor}
                      onChange={(val) => setBarlowFactor(Number(val) || 1.0)}
                      min={1.0}
                      max={5.0}
                      step={0.5}
                      precision={1}
                    />
                  </GridCol>
                  {calculationResults && (
                    <>
                      <GridCol span={{ base: 6, md: 3 }}>
                        <Card className="p-3 bg-card h-full">
                          <Text size="xs" c="dimmed" className="mb-1">Effective Focal Length</Text>
                          <Text size="sm" fw="semibold">{calculationResults.effectiveFocalLength.toFixed(0)}mm</Text>
                        </Card>
                      </GridCol>
                      <GridCol span={{ base: 6, md: 3 }}>
                        <Card className="p-3 bg-card h-full">
                          <Text size="xs" c="dimmed" className="mb-1">Effective f/Ratio</Text>
                          <Text size="sm" fw="semibold">f/{calculationResults.effectiveFocalRatio.toFixed(1)}</Text>
                        </Card>
                      </GridCol>
                    </>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </GridCol>
        </Grid>

        {/* Results */}
        {calculationResults ? (
          <Grid>
            {/* Pixel Scale Visualization */}
            <GridCol span={{ base: 12, lg: 6 }}>
              <Card className="h-full">
                <CardContent className="p-6">
                  <Text fw="semibold" size="lg" className="mb-4">Pixel Scale Analysis</Text>

                  <Group align="start" gap="xl">
                    {/* Gauge */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Box style={{ position: 'relative', height: 200, width: 60 }}>
                          {/* Gradient bar */}
                          <Box
                            style={{
                              position: 'absolute',
                              left: 15,
                              width: 30,
                              height: '100%',
                              borderRadius: 15,
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
                              border: '2px solid rgba(255, 255, 255, 0.15)',
                            }}
                          />

                          {/* Current value marker */}
                          <Box
                            style={{
                              position: 'absolute',
                              top: `${100 - calculationResults.markerPosition}%`,
                              left: 0,
                              transform: 'translateY(-50%)',
                              width: 60,
                              height: 4,
                              backgroundColor: 'white',
                              borderRadius: 2,
                              boxShadow: '0 0 8px rgba(0, 0, 0, 0.5)',
                              zIndex: 10,
                            }}
                          />

                          {/* Scale labels */}
                          <Text
                            size="xs"
                            c="dimmed"
                            style={{ position: 'absolute', left: 50, top: 0 }}
                          >
                            0.3″
                          </Text>
                          <Text
                            size="xs"
                            c="dimmed"
                            style={{ position: 'absolute', left: 50, top: '30%', transform: 'translateY(-50%)' }}
                          >
                            0.7″
                          </Text>
                          <Text
                            size="xs"
                            c="dimmed"
                            style={{ position: 'absolute', left: 50, top: '50%', transform: 'translateY(-50%)' }}
                          >
                            1.5″
                          </Text>
                          <Text
                            size="xs"
                            c="dimmed"
                            style={{ position: 'absolute', left: 50, top: '70%', transform: 'translateY(-50%)' }}
                          >
                            2.5″
                          </Text>
                          <Text
                            size="xs"
                            c="dimmed"
                            style={{ position: 'absolute', left: 50, bottom: 0 }}
                          >
                            4.0″
                          </Text>
                        </Box>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[250px]">
                        <Text size="xs">{calculationResults.zone.label}: {calculationResults.zone.description}</Text>
                      </TooltipContent>
                    </Tooltip>

                    {/* Stats */}
                    <Stack gap="md" className="flex-1">
                      <Card className="p-4 bg-card">
                        <Text size="xs" c="dimmed" className="mb-1">Pixel Scale</Text>
                        <Text size="xl" fw="bold" style={{ color: calculationResults.zone.color }}>
                          {calculationResults.pixelScale.toFixed(2)}″/px
                        </Text>
                        <Text size="sm" fw="semibold" style={{ color: calculationResults.zone.color }} className="mt-1">
                          {calculationResults.zone.label}
                        </Text>
                      </Card>

                      <Card className="p-4">
                        <Text size="xs" c="dimmed" className="mb-1">Assessment</Text>
                        <Text size="sm">{calculationResults.zone.description}</Text>
                      </Card>

                      <Card className="p-4">
                        <Text size="xs" c="dimmed" className="mb-1">Field of View</Text>
                        <Text size="sm">
                          {calculationResults.fovWidth.toFixed(1)}′ × {calculationResults.fovHeight.toFixed(1)}′
                        </Text>
                        <Text size="xs" c="dimmed">
                          ({(calculationResults.fovWidth / 60).toFixed(2)}° × {(calculationResults.fovHeight / 60).toFixed(2)}°)
                        </Text>
                      </Card>
                    </Stack>
                  </Group>
                </CardContent>
              </Card>
            </GridCol>

            {/* Filter Size Visualization */}
            <GridCol span={{ base: 12, lg: 6 }}>
              <Card className="h-full">
                <CardContent className="p-6">
                  <Text fw="semibold" size="lg" className="mb-4">Minimum Filter Size</Text>

                  <Group align="start" gap="xl">
                    {/* Filter Visualization */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Box style={{ position: 'relative', width: 120, height: 120 }}>
                          {/* Filter circle (outer) */}
                          <Box
                            style={{
                              position: 'absolute',
                              left: '50%',
                              top: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: 100,
                              height: 100,
                              borderRadius: '50%',
                              border: '4px solid hsl(var(--primary))',
                              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)',
                              boxShadow: '0 0 12px rgba(59, 130, 246, 0.4)',
                            }}
                          />

                          {/* Sensor rectangle (inner) */}
                          {cameraValues && (
                            <Box
                              style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: (cameraValues.sensorWidth / calculationResults.recommendedFilter.diameterMm) * 80,
                                height: (cameraValues.sensorHeight / calculationResults.recommendedFilter.diameterMm) * 80,
                                border: '2px solid #51cf66',
                                background: 'rgba(81, 207, 102, 0.1)',
                              }}
                            />
                          )}
                        </Box>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[220px]">
                        <Box>
                          <Text size="xs">Sensor diagonal: {calculationResults.sensorDiagonal.toFixed(1)}mm</Text>
                          <Text size="xs" className="mt-1">{calculationResults.recommendedFilter.description}</Text>
                          <Text size="xs" c="dimmed" className="mt-1">
                            Includes 15% clearance to prevent vignetting
                          </Text>
                        </Box>
                      </TooltipContent>
                    </Tooltip>

                    {/* Filter Info */}
                    <Stack gap="md" className="flex-1">
                      <Card className="p-4 bg-card">
                        <Text size="xs" c="dimmed" className="mb-1">Recommended Filter</Text>
                        <Text size="xl" fw="bold" c="primary">
                          {calculationResults.recommendedFilter.size}
                        </Text>
                        <Text size="sm" c="dimmed" className="mt-1">
                          {calculationResults.recommendedFilter.diameterMm}mm diameter
                        </Text>
                      </Card>

                      <Card className="p-4">
                        <Text size="xs" c="dimmed" className="mb-1">Sensor Diagonal</Text>
                        <Text size="sm">{calculationResults.sensorDiagonal.toFixed(1)}mm</Text>
                      </Card>

                      <Card className="p-4">
                        <Text size="xs" c="dimmed" className="mb-2">All Filter Sizes</Text>
                        <Stack gap="xs">
                          {FILTER_SIZES.map((filter) => (
                            <Group key={filter.size} justify="between">
                              <Text
                                size="xs"
                                fw={filter.size === calculationResults.recommendedFilter.size ? 'bold' : 'normal'}
                                c={filter.size === calculationResults.recommendedFilter.size ? 'primary' : undefined}
                              >
                                {filter.size}
                              </Text>
                              <Text
                                size="xs"
                                style={{
                                  color: filter.diameterMm >= calculationResults.sensorDiagonal * 1.15 ? '#51cf66' : '#fa5252'
                                }}
                              >
                                {filter.diameterMm}mm {filter.diameterMm >= calculationResults.sensorDiagonal * 1.15 ? '✓' : '✗'}
                              </Text>
                            </Group>
                          ))}
                        </Stack>
                      </Card>
                    </Stack>
                  </Group>
                </CardContent>
              </Card>
            </GridCol>

            {/* Sampling Guide */}
            <GridCol span={12}>
              <Card>
                <CardContent className="p-4">
                  <Text fw="semibold" className="mb-4">Pixel Scale Reference Guide</Text>
                  <Grid gap="xs">
                    {ZONES.map((zone) => (
                      <GridCol key={zone.label} span={{ base: 12, sm: 6, md: 4, lg: 'auto' }}>
                        <Card
                          className="p-2"
                          style={{
                            borderColor: calculationResults.zone.label === zone.label ? zone.color : undefined,
                            borderWidth: calculationResults.zone.label === zone.label ? 2 : 1,
                            borderStyle: 'solid',
                          }}
                        >
                          <Group gap="xs" wrap="nowrap">
                            <Box
                              style={{
                                width: 12,
                                height: 12,
                                borderRadius: 3,
                                backgroundColor: zone.color,
                                flexShrink: 0,
                              }}
                            />
                            <Stack gap="none">
                              <Text size="xs" fw="semibold">{zone.label}</Text>
                              <Text size="xs" c="dimmed">{zone.min}″ - {zone.max}″</Text>
                            </Stack>
                          </Group>
                        </Card>
                      </GridCol>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </GridCol>
          </Grid>
        ) : (
          <Card>
            <CardContent className="p-12">
              <Text c="dimmed" ta="center">
                Select a telescope and camera to calculate pixel scale and filter requirements
              </Text>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
