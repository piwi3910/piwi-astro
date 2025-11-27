'use client';

import { useState, useEffect, useMemo } from 'react';
import { IconPlus, IconTrash, IconFocus2 } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import {
  useTelescopeBrands,
  useTelescopesByBrand,
  useCameraBrands,
  useCamerasByBrand,
} from '@/hooks/useGear';
import { calculateFOV } from '@/utils/fov';
import { Container } from '@/components/ui/container';
import { Stack } from '@/components/ui/stack';
import { Group } from '@/components/ui/group';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Title } from '@/components/ui/title';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader } from '@/components/ui/loader';
import { SelectField } from '@/components/ui/select-field';
import { NumberInput } from '@/components/ui/number-input';
import { Grid, GridCol } from '@/components/ui/grid';

interface Telescope {
  id: string;
  name: string;
  aperture: number;
  focalLength: number;
  focalRatio: number;
}

interface Camera {
  id: string;
  name: string;
  sensorWidth: number;
  sensorHeight: number;
  pixelSize: number;
  megapixels: number;
}

interface Rig {
  id: string;
  name: string;
  telescope: Telescope;
  camera: Camera;
  focalReducer: number | null;
  barlowLens: number | null;
  pixelScale: number;
  fovWidthArcmin: number;
  fovHeightArcmin: number;
}

interface Target {
  id: string;
  catalogId: string | null;
  name: string;
  type: string;
  raDeg: number;
  decDeg: number;
  sizeMajorArcmin: number | null;
  magnitude: number | null;
  constellation: string | null;
}

interface UserTarget {
  id: string;
  targetId: string;
  target: Target;
}

// FOV overlay entry for comparison - now includes mosaic settings
interface FOVOverlay {
  id: string;
  name: string;
  color: string;
  fovWidthArcmin: number;
  fovHeightArcmin: number;
  pixelScale: number;
  isCustom: boolean;
  telescopeName?: string;
  cameraName?: string;
  // Mosaic settings per overlay
  horizontalPanels: number;
  verticalPanels: number;
  overlapPercent: number;
}

// Predefined colors for FOV overlays
const FOV_COLORS = [
  '#4dabf7', // Blue
  '#51cf66', // Green
  '#fcc419', // Yellow
  '#ff6b6b', // Red
  '#cc5de8', // Purple
  '#20c997', // Teal
  '#fd7e14', // Orange
  '#868e96', // Gray
];

const CUSTOM_RIG_ID = '__custom__';

async function fetchRigs(): Promise<Rig[]> {
  const response = await fetch('/api/rigs');
  if (!response.ok) throw new Error('Failed to fetch rigs');
  return response.json();
}

async function fetchUserTargets(): Promise<UserTarget[]> {
  const response = await fetch('/api/user-targets');
  if (!response.ok) throw new Error('Failed to fetch targets');
  return response.json();
}

export default function FOVPlannerPage() {
  const [selectedRigId, setSelectedRigId] = useState<string>('');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  // Custom rig selection state - using catalog brand/model pattern
  const [selectedTelescopeBrand, setSelectedTelescopeBrand] = useState<string | null>(null);
  const [selectedTelescopeModelId, setSelectedTelescopeModelId] = useState<string | null>(null);
  const [selectedCameraBrand, setSelectedCameraBrand] = useState<string | null>(null);
  const [selectedCameraModelId, setSelectedCameraModelId] = useState<string | null>(null);
  const [customReducer, setCustomReducer] = useState<number>(1.0);
  const [customBarlow, setCustomBarlow] = useState<number>(1.0);

  // FOV overlay list for comparison
  const [fovOverlays, setFovOverlays] = useState<FOVOverlay[]>([]);
  // Currently selected/active FOV overlay ID
  const [activeFovId, setActiveFovId] = useState<string | null>(null);

  const { data: rigs } = useQuery({
    queryKey: ['rigs'],
    queryFn: fetchRigs,
  });

  const { data: userTargets } = useQuery({
    queryKey: ['user-targets'],
    queryFn: fetchUserTargets,
  });

  // Fetch telescope and camera catalogs
  const { data: telescopeBrandsData } = useTelescopeBrands();
  const { data: telescopeModelsData } = useTelescopesByBrand(selectedTelescopeBrand);
  const { data: cameraBrandsData } = useCameraBrands();
  const { data: cameraModelsData } = useCamerasByBrand(selectedCameraBrand);

  const telescopeBrands = useMemo(() => telescopeBrandsData?.brands || [], [telescopeBrandsData]);
  const telescopeModels = useMemo(() => telescopeModelsData?.telescopes || [], [telescopeModelsData]);
  const cameraBrands = useMemo(() => cameraBrandsData?.brands || [], [cameraBrandsData]);
  const cameraModels = useMemo(() => cameraModelsData?.cameras || [], [cameraModelsData]);

  // Get selected telescope and camera from catalog
  const selectedTelescope = useMemo(() => {
    if (!selectedTelescopeModelId) return null;
    return telescopeModels.find((t) => t.id === selectedTelescopeModelId) || null;
  }, [selectedTelescopeModelId, telescopeModels]);

  const selectedCamera = useMemo(() => {
    if (!selectedCameraModelId) return null;
    return cameraModels.find((c) => c.id === selectedCameraModelId) || null;
  }, [selectedCameraModelId, cameraModels]);

  const isCustomMode = selectedRigId === CUSTOM_RIG_ID;

  // Calculate custom FOV when in custom mode
  const customFOV = useMemo(() => {
    if (!isCustomMode || !selectedTelescope || !selectedCamera) return null;

    const fov = calculateFOV(
      selectedTelescope.focalLengthMm,
      selectedCamera.sensorWidthMm,
      selectedCamera.sensorHeightMm,
      selectedCamera.pixelSizeUm,
      customReducer,
      customBarlow
    );

    return {
      ...fov,
      telescope: selectedTelescope,
      camera: selectedCamera,
    };
  }, [isCustomMode, selectedTelescope, selectedCamera, customReducer, customBarlow]);

  // Get current FOV data (either from selected rig or custom)
  const currentFOVData = useMemo(() => {
    if (isCustomMode && customFOV) {
      const telescopeName = `${customFOV.telescope.brand} ${customFOV.telescope.model}`;
      const cameraName = `${customFOV.camera.brand} ${customFOV.camera.model}`;
      return {
        fovWidthArcmin: customFOV.fovWidthArcmin,
        fovHeightArcmin: customFOV.fovHeightArcmin,
        pixelScale: customFOV.pixelScaleArcsecPerPixel,
        name: `${telescopeName} + ${cameraName}`,
        telescopeName,
        cameraName,
        isCustom: true,
      };
    }

    const selectedRig = rigs?.find((r) => r.id === selectedRigId);
    if (selectedRig) {
      return {
        fovWidthArcmin: selectedRig.fovWidthArcmin,
        fovHeightArcmin: selectedRig.fovHeightArcmin,
        pixelScale: selectedRig.pixelScale,
        name: selectedRig.name,
        telescopeName: selectedRig.telescope.name,
        cameraName: selectedRig.camera.name,
        isCustom: false,
      };
    }

    return null;
  }, [isCustomMode, customFOV, rigs, selectedRigId]);

  const selectedTarget = userTargets?.find((ut) => ut.targetId === selectedTargetId)?.target;

  // Get the active FOV overlay
  const activeFovOverlay = useMemo(() => {
    if (!activeFovId) return null;
    return fovOverlays.find((o) => o.id === activeFovId) || null;
  }, [activeFovId, fovOverlays]);

  // Get next available color for FOV overlay
  const getNextColor = (): string => {
    const usedColors = fovOverlays.map((o) => o.color);
    const availableColor = FOV_COLORS.find((c) => !usedColors.includes(c));
    return availableColor || FOV_COLORS[fovOverlays.length % FOV_COLORS.length];
  };

  // Add current FOV to overlay list
  const handleAddFOV = () => {
    if (!currentFOVData) return;

    // Check if already exists
    const exists = fovOverlays.some(
      (o) =>
        o.fovWidthArcmin === currentFOVData.fovWidthArcmin &&
        o.fovHeightArcmin === currentFOVData.fovHeightArcmin &&
        o.name === currentFOVData.name
    );

    if (exists) return;

    const newOverlay: FOVOverlay = {
      id: `fov-${Date.now()}`,
      name: currentFOVData.name,
      color: getNextColor(),
      fovWidthArcmin: currentFOVData.fovWidthArcmin,
      fovHeightArcmin: currentFOVData.fovHeightArcmin,
      pixelScale: currentFOVData.pixelScale,
      isCustom: currentFOVData.isCustom,
      telescopeName: currentFOVData.telescopeName,
      cameraName: currentFOVData.cameraName,
      // Default mosaic settings
      horizontalPanels: 1,
      verticalPanels: 1,
      overlapPercent: 20,
    };

    setFovOverlays([...fovOverlays, newOverlay]);
    // Auto-select the new overlay
    setActiveFovId(newOverlay.id);
  };

  // Remove FOV from overlay list
  const handleRemoveFOV = (id: string) => {
    setFovOverlays(fovOverlays.filter((o) => o.id !== id));
    // If removing the active one, select another or none
    if (activeFovId === id) {
      const remaining = fovOverlays.filter((o) => o.id !== id);
      setActiveFovId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // Update mosaic settings for the active FOV
  const updateActiveFovMosaic = (field: 'horizontalPanels' | 'verticalPanels' | 'overlapPercent', value: number) => {
    if (!activeFovId) return;
    setFovOverlays(fovOverlays.map((o) =>
      o.id === activeFovId ? { ...o, [field]: value } : o
    ));
  };

  // Calculate mosaic data for a specific FOV overlay
  const getMosaicDataForOverlay = (overlay: FOVOverlay) => {
    const fovWidth = overlay.fovWidthArcmin;
    const fovHeight = overlay.fovHeightArcmin;
    const overlap = overlay.overlapPercent / 100;

    const effectiveWidth = fovWidth * (1 - overlap);
    const effectiveHeight = fovHeight * (1 - overlap);

    const totalWidth = overlay.horizontalPanels === 1 ? fovWidth : (overlay.horizontalPanels - 1) * effectiveWidth + fovWidth;
    const totalHeight = overlay.verticalPanels === 1 ? fovHeight : (overlay.verticalPanels - 1) * effectiveHeight + fovHeight;

    const panels: { x: number; y: number }[] = [];
    for (let row = 0; row < overlay.verticalPanels; row++) {
      for (let col = 0; col < overlay.horizontalPanels; col++) {
        panels.push({
          x: col * effectiveWidth - totalWidth / 2 + fovWidth / 2,
          y: row * effectiveHeight - totalHeight / 2 + fovHeight / 2,
        });
      }
    }

    return {
      fovWidth,
      fovHeight,
      totalWidth,
      totalHeight,
      panels,
      panelCount: overlay.horizontalPanels * overlay.verticalPanels,
    };
  };

  // Calculate required image FOV for DSS request
  const getRequiredImageFOV = (): number => {
    let maxDiagonal = 0;

    // Calculate max diagonal from all overlays with their mosaics
    for (const overlay of fovOverlays) {
      const mosaicData = getMosaicDataForOverlay(overlay);
      const diagonal = Math.sqrt(mosaicData.totalWidth ** 2 + mosaicData.totalHeight ** 2);
      maxDiagonal = Math.max(maxDiagonal, diagonal);
    }

    // Include target size
    const targetSize = selectedTarget?.sizeMajorArcmin || 0;
    const baseFOV = Math.max(maxDiagonal, targetSize);

    return baseFOV > 0 ? baseFOV * 2 : 60; // Default to 60 arcmin if nothing
  };

  // Generate DSS image URL for target
  const getDSSImageUrl = (target: Target | undefined, imageFovArcmin: number): string | null => {
    if (!target) return null;

    const raDeg = target.raDeg;
    const decDeg = target.decDeg;
    const fovDeg = imageFovArcmin / 60;

    const params = new URLSearchParams({
      hips: 'CDS/P/DSS2/color',
      ra: raDeg.toString(),
      dec: decDeg.toString(),
      width: '700',
      height: '500',
      fov: fovDeg.toString(),
      format: 'jpg',
    });

    const externalUrl = `https://alasky.u-strasbg.fr/hips-image-services/hips2fits?${params}`;
    return `/api/image-proxy?url=${encodeURIComponent(externalUrl)}`;
  };

  // Calculate visualization data
  const getVisualizationData = () => {
    const canvasWidth = 700;
    const canvasHeight = 500;

    if (fovOverlays.length === 0) return null;

    const imageFovArcmin = getRequiredImageFOV();
    const scale = Math.min(canvasWidth, canvasHeight) / imageFovArcmin;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    // Calculate target size
    let targetWidthPx = 0;
    let targetHeightPx = 0;
    if (selectedTarget?.sizeMajorArcmin) {
      targetWidthPx = selectedTarget.sizeMajorArcmin * scale;
      targetHeightPx = selectedTarget.sizeMajorArcmin * scale;
    }

    // Calculate all overlays with their mosaics in pixels
    const overlaysWithMosaics = fovOverlays.map((overlay) => {
      const mosaicData = getMosaicDataForOverlay(overlay);
      return {
        ...overlay,
        fovWidthPx: mosaicData.fovWidth * scale,
        fovHeightPx: mosaicData.fovHeight * scale,
        totalWidthArcmin: mosaicData.totalWidth,
        totalHeightArcmin: mosaicData.totalHeight,
        panelCount: mosaicData.panelCount,
        panelsPx: mosaicData.panels.map((p) => ({
          x: centerX + p.x * scale,
          y: centerY + p.y * scale,
        })),
      };
    });

    return {
      canvasWidth,
      canvasHeight,
      centerX,
      centerY,
      targetWidthPx,
      targetHeightPx,
      imageFovArcmin,
      scale,
      overlaysWithMosaics,
    };
  };

  const vizData = getVisualizationData();

  const dssImageUrl =
    vizData && selectedTarget ? getDSSImageUrl(selectedTarget, vizData.imageFovArcmin) : null;

  useEffect(() => {
    if (dssImageUrl) {
      setImageLoading(true);
      setImageError(false);
    } else {
      setImageLoading(false);
      setImageError(false);
    }
  }, [dssImageUrl]);

  // Build rig select options with custom option
  const rigSelectOptions = useMemo(() => {
    const options =
      rigs?.map((r) => ({
        value: r.id,
        label: `${r.name} (${r.telescope.name} + ${r.camera.name})`,
      })) || [];

    return [{ value: CUSTOM_RIG_ID, label: '⚙️ Custom (Select from Catalog)' }, ...options];
  }, [rigs]);

  const hasValidSelection = currentFOVData !== null;
  const hasFovOverlays = fovOverlays.length > 0;

  return (
    <Container size="xl" className="py-8">
      <Stack gap="lg">
        <Title order={1}>Field of View Planner</Title>

        <Text className="text-muted-foreground">
          Compare different telescope and camera combinations. Add FOVs to comparison, select one to edit its mosaic settings.
        </Text>

        <Grid gutter="md">
          <GridCol span={{ base: 12, md: 6 }}>
            <SelectField
              label="Select Rig"
              placeholder="Choose a rig or custom setup"
              data={rigSelectOptions}
              value={selectedRigId}
              onChange={(val) => setSelectedRigId(val || '')}
            />
          </GridCol>
          <GridCol span={{ base: 12, md: 6 }}>
            <SelectField
              label="Select Target"
              placeholder="Choose a target"
              data={
                userTargets?.map((ut) => ({
                  value: ut.targetId,
                  label: `${ut.target.name}${ut.target.catalogId ? ` (${ut.target.catalogId})` : ''}`,
                })) || []
              }
              value={selectedTargetId}
              onChange={(val) => setSelectedTargetId(val || '')}
            />
          </GridCol>
        </Grid>

        {/* Custom Telescope/Camera Selection from Catalog */}
        {isCustomMode && (
          <Card className="border">
            <CardContent className="pt-4">
              <Grid gutter="sm">
                {/* Telescope Selection */}
                <GridCol span={{ base: 12, sm: 6, md: 3 }}>
                  <SelectField
                    label="Telescope Brand"
                    placeholder="Brand"
                    data={telescopeBrands.map((brand) => ({ value: brand, label: brand }))}
                    value={selectedTelescopeBrand || ''}
                    onChange={(value) => {
                      setSelectedTelescopeBrand(value || null);
                      setSelectedTelescopeModelId(null);
                    }}
                  />
                </GridCol>
                <GridCol span={{ base: 12, sm: 6, md: 3 }}>
                  <SelectField
                    label="Telescope Model"
                    placeholder={selectedTelescopeBrand ? 'Model' : 'Select brand'}
                    data={telescopeModels.map((t) => ({
                      value: t.id,
                      label: `${t.model} (${t.apertureMm}mm f/${t.focalRatio.toFixed(1)})`,
                    }))}
                    value={selectedTelescopeModelId || ''}
                    onChange={(val) => setSelectedTelescopeModelId(val || null)}
                    disabled={!selectedTelescopeBrand}
                  />
                </GridCol>

                {/* Camera Selection */}
                <GridCol span={{ base: 12, sm: 6, md: 3 }}>
                  <SelectField
                    label="Camera Brand"
                    placeholder="Brand"
                    data={cameraBrands.map((brand) => ({ value: brand, label: brand }))}
                    value={selectedCameraBrand || ''}
                    onChange={(value) => {
                      setSelectedCameraBrand(value || null);
                      setSelectedCameraModelId(null);
                    }}
                  />
                </GridCol>
                <GridCol span={{ base: 12, sm: 6, md: 3 }}>
                  <SelectField
                    label="Camera Model"
                    placeholder={selectedCameraBrand ? 'Model' : 'Select brand'}
                    data={cameraModels.map((c) => ({
                      value: c.id,
                      label: `${c.model} (${c.pixelSizeUm}µm)`,
                    }))}
                    value={selectedCameraModelId || ''}
                    onChange={(val) => setSelectedCameraModelId(val || null)}
                    disabled={!selectedCameraBrand}
                  />
                </GridCol>

                {/* Reducer/Barlow Options */}
                <GridCol span={{ base: 6, sm: 3, md: 2 }}>
                  <NumberInput
                    label="Reducer"
                    value={customReducer}
                    onChange={(val) => setCustomReducer(val || 1.0)}
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    precision={2}
                  />
                </GridCol>
                <GridCol span={{ base: 6, sm: 3, md: 2 }}>
                  <NumberInput
                    label="Barlow"
                    value={customBarlow}
                    onChange={(val) => setCustomBarlow(val || 1.0)}
                    min={1.0}
                    max={5.0}
                    step={0.5}
                    precision={1}
                  />
                </GridCol>

                {/* Calculated FOV inline */}
                <GridCol span={{ base: 12, sm: 6, md: 2 }}>
                  {customFOV ? (
                    <Card className="p-3 border bg-input h-full flex items-center">
                      <Text size="xs">
                        <span className="font-semibold text-muted-foreground">FOV: </span>
                        {customFOV.fovWidthArcmin.toFixed(1)}′ × {customFOV.fovHeightArcmin.toFixed(1)}′
                        <span className="text-muted-foreground"> | </span>
                        {customFOV.pixelScaleArcsecPerPixel.toFixed(2)}″/px
                      </Text>
                    </Card>
                  ) : (
                    <Card className="p-3 border bg-card h-full flex items-center">
                      <Text size="xs" className="text-muted-foreground">Select telescope & camera</Text>
                    </Card>
                  )}
                </GridCol>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Add FOV Button */}
        {hasValidSelection && (
          <Group>
            <Button onClick={handleAddFOV} variant="default">
              <IconPlus size={16} className="mr-2" />
              Add FOV to Comparison
            </Button>
            {currentFOVData && (
              <Text size="sm" className="text-muted-foreground">
                {currentFOVData.fovWidthArcmin.toFixed(1)}′ × {currentFOVData.fovHeightArcmin.toFixed(1)}′
                ({currentFOVData.name})
              </Text>
            )}
          </Group>
        )}

        {/* Main Visualization Area with Sidebars */}
        {hasFovOverlays && (
          <Grid gutter="md">
            {/* Left Sidebar - Mosaic Controls for Active FOV */}
            <GridCol span={{ base: 12, lg: 2 }}>
              <Card className="border h-full">
                <CardHeader>
                  <Text className="font-semibold text-base">
                    Mosaic Settings
                  </Text>
                </CardHeader>
                <CardContent>
                  {activeFovOverlay ? (
                    <Stack gap="md">
                      <Card className="p-2 border-2" style={{ borderColor: activeFovOverlay.color }}>
                        <Group gap="xs" className="mb-2">
                          <div
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 3,
                              backgroundColor: activeFovOverlay.color,
                            }}
                          />
                          <Text size="xs" className="font-semibold truncate flex-1">
                            {activeFovOverlay.name.length > 15
                              ? activeFovOverlay.name.substring(0, 15) + '...'
                              : activeFovOverlay.name}
                          </Text>
                        </Group>
                        <Text size="xs" className="text-muted-foreground">
                          {activeFovOverlay.fovWidthArcmin.toFixed(1)}′ × {activeFovOverlay.fovHeightArcmin.toFixed(1)}′
                        </Text>
                      </Card>

                      <NumberInput
                        label="Horizontal"
                        value={activeFovOverlay.horizontalPanels}
                        onChange={(val) => updateActiveFovMosaic('horizontalPanels', val || 1)}
                        min={1}
                        max={10}
                        step={1}
                      />
                      <NumberInput
                        label="Vertical"
                        value={activeFovOverlay.verticalPanels}
                        onChange={(val) => updateActiveFovMosaic('verticalPanels', val || 1)}
                        min={1}
                        max={10}
                        step={1}
                      />
                      <NumberInput
                        label="Overlap %"
                        value={activeFovOverlay.overlapPercent}
                        onChange={(val) => updateActiveFovMosaic('overlapPercent', val || 20)}
                        min={10}
                        max={50}
                        step={5}
                      />

                      {activeFovOverlay.horizontalPanels * activeFovOverlay.verticalPanels > 1 && (
                        <Card className="p-2 border bg-input">
                          <Text size="xs" className="text-muted-foreground">Total Coverage:</Text>
                          <Text size="xs">
                            {(() => {
                              const m = getMosaicDataForOverlay(activeFovOverlay);
                              return `${m.totalWidth.toFixed(1)}′ × ${m.totalHeight.toFixed(1)}′`;
                            })()}
                          </Text>
                          <Text size="xs" className="text-muted-foreground">
                            {activeFovOverlay.horizontalPanels * activeFovOverlay.verticalPanels} panels
                          </Text>
                        </Card>
                      )}
                    </Stack>
                  ) : (
                    <Text size="sm" className="text-muted-foreground text-center">
                      Select a FOV from the list to edit its mosaic settings
                    </Text>
                  )}
                </CardContent>
              </Card>
            </GridCol>

            {/* Center - Visualization */}
            <GridCol span={{ base: 12, lg: 7 }}>
              <Card className="border h-full">
                <CardHeader>
                  <Text className="font-semibold text-lg">
                    Field of View Visualization
                  </Text>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <svg
                      width={vizData?.canvasWidth || 700}
                      height={vizData?.canvasHeight || 500}
                      style={{
                        border: '1px solid hsl(var(--border))',
                        overflow: 'hidden',
                        maxWidth: '100%',
                      }}
                      viewBox={`0 0 ${vizData?.canvasWidth || 700} ${vizData?.canvasHeight || 500}`}
                    >
                      {/* Background */}
                      {dssImageUrl ? (
                        <>
                          <image
                            href={dssImageUrl}
                            width={vizData?.canvasWidth || 700}
                            height={vizData?.canvasHeight || 500}
                            preserveAspectRatio="xMidYMid slice"
                            onLoad={() => {
                              setImageLoading(false);
                              setImageError(false);
                            }}
                            onError={() => {
                              setImageLoading(false);
                              setImageError(true);
                            }}
                            style={{ display: imageLoading || imageError ? 'none' : 'block' }}
                          />
                          {!imageLoading && !imageError && (
                            <rect
                              width={vizData?.canvasWidth || 700}
                              height={vizData?.canvasHeight || 500}
                              fill="black"
                              opacity="0.2"
                            />
                          )}
                          {imageLoading && (
                            <>
                              <rect width={vizData?.canvasWidth || 700} height={vizData?.canvasHeight || 500} fill="#0a0e27" />
                              <foreignObject
                                x={(vizData?.canvasWidth || 700) / 2 - 50}
                                y={(vizData?.canvasHeight || 500) / 2 - 50}
                                width={100}
                                height={100}
                              >
                                <div className="flex items-center justify-center w-full h-full">
                                  <Loader color="primary" size="lg" />
                                </div>
                              </foreignObject>
                            </>
                          )}
                          {imageError && (
                            <>
                              <rect width={vizData?.canvasWidth || 700} height={vizData?.canvasHeight || 500} fill="#0a0e27" />
                              {[...Array(50)].map((_, i) => (
                                <circle
                                  key={i}
                                  cx={Math.random() * (vizData?.canvasWidth || 700)}
                                  cy={Math.random() * (vizData?.canvasHeight || 500)}
                                  r={Math.random() * 1.5 + 0.5}
                                  fill="white"
                                  opacity={Math.random() * 0.7 + 0.3}
                                />
                              ))}
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <rect width={vizData?.canvasWidth || 700} height={vizData?.canvasHeight || 500} fill="#0a0e27" />
                          {[...Array(50)].map((_, i) => (
                            <circle
                              key={i}
                              cx={Math.random() * (vizData?.canvasWidth || 700)}
                              cy={Math.random() * (vizData?.canvasHeight || 500)}
                              r={Math.random() * 1.5 + 0.5}
                              fill="white"
                              opacity={Math.random() * 0.7 + 0.3}
                            />
                          ))}
                        </>
                      )}

                      {/* Render all FOV overlays with their mosaics */}
                      {vizData?.overlaysWithMosaics.map((overlay) => {
                        const isActive = overlay.id === activeFovId;
                        const strokeWidth = isActive ? 2 : 1;
                        const opacity = isActive ? 1 : 0.6;

                        return (
                          <g key={overlay.id}>
                            {/* Render all panels for this overlay */}
                            {overlay.panelsPx.map((panel, index) => (
                              <rect
                                key={`${overlay.id}-panel-${index}`}
                                x={panel.x - overlay.fovWidthPx / 2}
                                y={panel.y - overlay.fovHeightPx / 2}
                                width={overlay.fovWidthPx}
                                height={overlay.fovHeightPx}
                                fill="none"
                                stroke={overlay.color}
                                strokeWidth={strokeWidth}
                                strokeDasharray={isActive ? 'none' : '8,4'}
                                opacity={opacity}
                              />
                            ))}
                          </g>
                        );
                      })}

                      {/* Target ellipse (only show if no DSS image) */}
                      {selectedTarget && !dssImageUrl && vizData && vizData.targetWidthPx > 0 && (
                        <>
                          <ellipse
                            cx={vizData.centerX}
                            cy={vizData.centerY}
                            rx={vizData.targetWidthPx / 2}
                            ry={vizData.targetHeightPx / 2}
                            fill="#f03e3e"
                            opacity="0.3"
                            stroke="#f03e3e"
                            strokeWidth="2"
                          />
                          <text
                            x={vizData.centerX}
                            y={vizData.centerY - vizData.targetHeightPx / 2 - 10}
                            textAnchor="middle"
                            fill="#f03e3e"
                            fontSize="14"
                            fontWeight="bold"
                          >
                            {selectedTarget.name}
                          </text>
                        </>
                      )}

                      {/* Target Name Label (show on DSS image) */}
                      {selectedTarget && dssImageUrl && vizData && (
                        <text
                          x={vizData.centerX}
                          y={vizData.canvasHeight - 15}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="14"
                          fontWeight="bold"
                          style={{ textShadow: '0 0 4px black, 0 0 8px black' }}
                        >
                          {selectedTarget.name}
                          {selectedTarget.catalogId && ` (${selectedTarget.catalogId})`}
                        </text>
                      )}
                    </svg>
                  </div>

                  <Text size="sm" className="text-muted-foreground text-center mt-4">
                    Click on a FOV in the right panel to select it • Solid line = active • Dashed = inactive
                  </Text>
                </CardContent>
              </Card>
            </GridCol>

            {/* Right Sidebar - FOV Comparison List */}
            <GridCol span={{ base: 12, lg: 3 }}>
              <Card className="border h-full">
                <CardHeader>
                  <Text className="font-semibold text-base">
                    FOV Comparison ({fovOverlays.length})
                  </Text>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[450px]">
                    <Stack gap="xs">
                      {fovOverlays.map((overlay) => {
                        const isActive = overlay.id === activeFovId;
                        const mosaicData = getMosaicDataForOverlay(overlay);

                        return (
                          <Card
                            key={overlay.id}
                            className="p-2 border cursor-pointer"
                            style={{
                              borderColor: isActive ? overlay.color : undefined,
                              borderWidth: isActive ? 2 : 1,
                              backgroundColor: isActive ? 'hsl(var(--card))' : undefined,
                            }}
                            onClick={() => setActiveFovId(overlay.id)}
                          >
                            <Group className="justify-between flex-nowrap gap-2">
                              <Group gap="xs" className="flex-nowrap flex-1 min-w-0">
                                <div
                                  style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: 4,
                                    backgroundColor: overlay.color,
                                    flexShrink: 0,
                                  }}
                                />
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Stack gap="xs" className="min-w-0">
                                        <Text size="xs" className={isActive ? 'font-semibold' : 'font-medium'} truncate>
                                          {overlay.name}
                                        </Text>
                                        <Text size="xs" className="text-muted-foreground">
                                          {overlay.fovWidthArcmin.toFixed(1)}′ × {overlay.fovHeightArcmin.toFixed(1)}′
                                        </Text>
                                        {mosaicData.panelCount > 1 && (
                                          <Text size="xs" className="text-muted-foreground">
                                            {mosaicData.panelCount} panels ({mosaicData.totalWidth.toFixed(0)}′×{mosaicData.totalHeight.toFixed(0)}′)
                                          </Text>
                                        )}
                                      </Stack>
                                    </TooltipTrigger>
                                    <TooltipContent className="w-48">
                                      <p>{overlay.telescopeName} + {overlay.cameraName}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </Group>
                              <Group gap="xs">
                                {isActive && (
                                  <Badge size="sm" variant="default">
                                    <IconFocus2 size={10} />
                                  </Badge>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveFOV(overlay.id);
                                  }}
                                >
                                  <IconTrash size={14} />
                                </Button>
                              </Group>
                            </Group>
                            {overlay.isCustom && (
                              <Badge size="sm" variant="secondary" className="mt-2">
                                Custom
                              </Badge>
                            )}
                          </Card>
                        );
                      })}
                    </Stack>
                  </ScrollArea>
                </CardContent>
              </Card>
            </GridCol>
          </Grid>
        )}

        {!hasFovOverlays && (
          <Card className="border">
            <CardContent className="py-12">
              <Text className="text-muted-foreground text-center">
                {hasValidSelection
                  ? 'Click "Add FOV to Comparison" to start comparing equipment'
                  : 'Select a rig or custom telescope/camera combination, then add it to comparison'}
              </Text>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
