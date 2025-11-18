'use client';

import { useState } from 'react';
import {
  Container,
  Title,
  Stack,
  Group,
  Select,
  Card,
  Text,
  Badge,
  Grid,
  Paper,
  NumberInput,
  Divider,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';

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
  sizeMajorArcmin: number | null;
  magnitude: number | null;
  constellation: string | null;
}

interface UserTarget {
  id: string;
  targetId: string;
  target: Target;
}

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

export default function FOVPlannerPage(): JSX.Element {
  const [selectedRigId, setSelectedRigId] = useState<string>('');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [horizontalPanels, setHorizontalPanels] = useState<number>(1);
  const [verticalPanels, setVerticalPanels] = useState<number>(1);
  const [overlapPercent, setOverlapPercent] = useState<number>(20);

  const { data: rigs } = useQuery({
    queryKey: ['rigs'],
    queryFn: fetchRigs,
  });

  const { data: userTargets } = useQuery({
    queryKey: ['user-targets'],
    queryFn: fetchUserTargets,
  });

  const selectedRig = rigs?.find((r) => r.id === selectedRigId);
  const selectedTarget = userTargets?.find((ut) => ut.targetId === selectedTargetId)?.target;

  // Calculate if target fits in FOV
  const targetFitsWidth =
    selectedRig &&
    selectedTarget?.sizeMajorArcmin &&
    selectedTarget.sizeMajorArcmin <= selectedRig.fovWidthArcmin;
  const targetFitsHeight =
    selectedRig &&
    selectedTarget?.sizeMajorArcmin &&
    selectedTarget.sizeMajorArcmin <= selectedRig.fovHeightArcmin;
  const targetFits = targetFitsWidth && targetFitsHeight;

  // Calculate mosaic dimensions
  const getMosaicData = () => {
    if (!selectedRig) return null;

    const fovWidth = selectedRig.fovWidthArcmin;
    const fovHeight = selectedRig.fovHeightArcmin;
    const overlap = overlapPercent / 100;

    // Effective FOV per panel (accounting for overlap)
    const effectiveWidth = fovWidth * (1 - overlap);
    const effectiveHeight = fovHeight * (1 - overlap);

    // Total mosaic coverage
    const totalWidth = horizontalPanels === 1 ? fovWidth : (horizontalPanels - 1) * effectiveWidth + fovWidth;
    const totalHeight = verticalPanels === 1 ? fovHeight : (verticalPanels - 1) * effectiveHeight + fovHeight;

    // Panel positions
    const panels: { x: number; y: number }[] = [];
    for (let row = 0; row < verticalPanels; row++) {
      for (let col = 0; col < horizontalPanels; col++) {
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
      panelCount: horizontalPanels * verticalPanels,
    };
  };

  // Calculate scale factor for visualization
  const getVisualizationData = () => {
    if (!selectedRig) return null;

    const mosaicData = getMosaicData();
    if (!mosaicData) return null;

    const canvasWidth = 700;
    const canvasHeight = 500;

    // Determine what to fit in the canvas (single FOV or total mosaic)
    const displayWidth = mosaicData.totalWidth;
    const displayHeight = mosaicData.totalHeight;

    // Scale to fit canvas with padding
    const scaleX = (canvasWidth * 0.85) / displayWidth;
    const scaleY = (canvasHeight * 0.85) / displayHeight;
    const scale = Math.min(scaleX, scaleY);

    // Center of canvas
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    // FOV dimensions in pixels
    const fovWidthPx = mosaicData.fovWidth * scale;
    const fovHeightPx = mosaicData.fovHeight * scale;

    // Target size in pixels (if target is selected)
    let targetWidthPx = 0;
    let targetHeightPx = 0;
    if (selectedTarget?.sizeMajorArcmin) {
      targetWidthPx = selectedTarget.sizeMajorArcmin * scale;
      targetHeightPx = selectedTarget.sizeMajorArcmin * scale;
    }

    // Panel positions in pixels
    const panelsPx = mosaicData.panels.map(p => ({
      x: centerX + p.x * scale,
      y: centerY + p.y * scale,
    }));

    return {
      canvasWidth,
      canvasHeight,
      fovWidthPx,
      fovHeightPx,
      centerX,
      centerY,
      targetWidthPx,
      targetHeightPx,
      panelsPx,
      totalWidthArcmin: mosaicData.totalWidth,
      totalHeightArcmin: mosaicData.totalHeight,
      panelCount: mosaicData.panelCount,
    };
  };

  const vizData = getVisualizationData();

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Title order={1}>Field of View Planner</Title>

        <Text c="dimmed">
          Visualize how your target will fit in your camera's field of view with different
          telescope and camera combinations.
        </Text>

        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Select
              label="Select Rig"
              placeholder="Choose a rig"
              data={
                rigs?.map((r) => ({
                  value: r.id,
                  label: `${r.name} (${r.telescope.name} + ${r.camera.name})`,
                })) || []
              }
              value={selectedRigId}
              onChange={(val) => setSelectedRigId(val || '')}
              searchable
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Select
              label="Select Target"
              placeholder="Choose a target"
              data={
                userTargets?.map((ut) => ({
                  value: ut.targetId,
                  label: `${ut.target.name}${
                    ut.target.catalogId ? ` (${ut.target.catalogId})` : ''
                  }`,
                })) || []
              }
              value={selectedTargetId}
              onChange={(val) => setSelectedTargetId(val || '')}
              searchable
            />
          </Grid.Col>
        </Grid>

        {selectedRig && (
          <Card shadow="sm" padding="lg" withBorder>
            <Text fw={600} size="md" mb="md">
              Mosaic Planning
            </Text>
            <Grid>
              <Grid.Col span={{ base: 12, sm: 4 }}>
                <NumberInput
                  label="Horizontal Panels"
                  description="Number of frames across"
                  value={horizontalPanels}
                  onChange={(val) => setHorizontalPanels(Number(val) || 1)}
                  min={1}
                  max={10}
                  step={1}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 4 }}>
                <NumberInput
                  label="Vertical Panels"
                  description="Number of frames down"
                  value={verticalPanels}
                  onChange={(val) => setVerticalPanels(Number(val) || 1)}
                  min={1}
                  max={10}
                  step={1}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 4 }}>
                <NumberInput
                  label="Overlap %"
                  description="Panel overlap percentage"
                  value={overlapPercent}
                  onChange={(val) => setOverlapPercent(Number(val) || 20)}
                  min={10}
                  max={50}
                  step={5}
                  suffix="%"
                />
              </Grid.Col>
            </Grid>
            {vizData && vizData.panelCount > 1 && (
              <Paper p="sm" mt="md" withBorder style={{ background: 'var(--mantine-color-blue-0)' }}>
                <Group justify="space-between">
                  <Text size="sm" fw={600}>
                    Total Mosaic Coverage:
                  </Text>
                  <Text size="sm">
                    {vizData.totalWidthArcmin.toFixed(1)}′ × {vizData.totalHeightArcmin.toFixed(1)}′ ({vizData.panelCount} panels)
                  </Text>
                </Group>
              </Paper>
            )}
          </Card>
        )}

        {selectedRig && (
          <Card shadow="sm" padding="lg" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={600} size="lg">
                  {selectedRig.name}
                </Text>
                {selectedTarget && (
                  <Badge color={targetFits ? 'green' : 'red'} size="lg">
                    {targetFits ? 'Target Fits' : 'Target Too Large'}
                  </Badge>
                )}
              </Group>

              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder>
                    <Text size="sm" fw={600} mb="xs">
                      Telescope
                    </Text>
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          Name:
                        </Text>
                        <Text size="sm">{selectedRig.telescope.name}</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          Aperture:
                        </Text>
                        <Text size="sm">{selectedRig.telescope.aperture}mm</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          Focal Length:
                        </Text>
                        <Text size="sm">{selectedRig.telescope.focalLength}mm</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          Focal Ratio:
                        </Text>
                        <Text size="sm">f/{selectedRig.telescope.focalRatio}</Text>
                      </Group>
                    </Stack>
                  </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder>
                    <Text size="sm" fw={600} mb="xs">
                      Camera
                    </Text>
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          Name:
                        </Text>
                        <Text size="sm">{selectedRig.camera.name}</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          Sensor:
                        </Text>
                        <Text size="sm">
                          {selectedRig.camera.sensorWidth}×{selectedRig.camera.sensorHeight}mm
                        </Text>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          Pixel Size:
                        </Text>
                        <Text size="sm">{selectedRig.camera.pixelSize}µm</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          Resolution:
                        </Text>
                        <Text size="sm">{selectedRig.camera.megapixels}MP</Text>
                      </Group>
                    </Stack>
                  </Paper>
                </Grid.Col>
              </Grid>

              {(selectedRig.focalReducer || selectedRig.barlowLens) && (
                <Paper p="md" withBorder>
                  <Text size="sm" fw={600} mb="xs">
                    Accessories
                  </Text>
                  <Stack gap="xs">
                    {selectedRig.focalReducer && (
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          Focal Reducer:
                        </Text>
                        <Text size="sm">{selectedRig.focalReducer}×</Text>
                      </Group>
                    )}
                    {selectedRig.barlowLens && (
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          Barlow Lens:
                        </Text>
                        <Text size="sm">{selectedRig.barlowLens}×</Text>
                      </Group>
                    )}
                  </Stack>
                </Paper>
              )}

              <Paper p="md" withBorder style={{ background: 'var(--mantine-color-blue-0)' }}>
                <Text size="sm" fw={600} mb="xs">
                  Calculated FOV
                </Text>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Pixel Scale:
                    </Text>
                    <Text size="sm" fw={600}>
                      {selectedRig.pixelScale.toFixed(2)}″/pixel
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      FOV (Width):
                    </Text>
                    <Text size="sm" fw={600}>
                      {selectedRig.fovWidthArcmin.toFixed(2)}′ (
                      {(selectedRig.fovWidthArcmin / 60).toFixed(2)}°)
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      FOV (Height):
                    </Text>
                    <Text size="sm" fw={600}>
                      {selectedRig.fovHeightArcmin.toFixed(2)}′ (
                      {(selectedRig.fovHeightArcmin / 60).toFixed(2)}°)
                    </Text>
                  </Group>
                </Stack>
              </Paper>

              {selectedTarget && (
                <Paper p="md" withBorder style={{ background: 'var(--mantine-color-grape-0)' }}>
                  <Text size="sm" fw={600} mb="xs">
                    Target Information
                  </Text>
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Name:
                      </Text>
                      <Text size="sm" fw={600}>
                        {selectedTarget.name}
                      </Text>
                    </Group>
                    {selectedTarget.catalogId && (
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          Catalog ID:
                        </Text>
                        <Text size="sm">{selectedTarget.catalogId}</Text>
                      </Group>
                    )}
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Type:
                      </Text>
                      <Text size="sm">{selectedTarget.type}</Text>
                    </Group>
                    {selectedTarget.sizeMajorArcmin && (
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          Size:
                        </Text>
                        <Text size="sm" fw={600}>
                          {selectedTarget.sizeMajorArcmin.toFixed(1)}′
                        </Text>
                      </Group>
                    )}
                    {selectedTarget.magnitude && (
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          Magnitude:
                        </Text>
                        <Text size="sm">{selectedTarget.magnitude}</Text>
                      </Group>
                    )}
                  </Stack>
                </Paper>
              )}
            </Stack>
          </Card>
        )}

        {vizData && (
          <Card shadow="sm" padding="lg" withBorder>
            <Text fw={600} size="lg" mb="md">
              Field of View Visualization
            </Text>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <svg
                width={vizData.canvasWidth}
                height={vizData.canvasHeight}
                style={{ border: '1px solid var(--mantine-color-gray-3)' }}
              >
                {/* Background */}
                <rect width={vizData.canvasWidth} height={vizData.canvasHeight} fill="#0a0e27" />

                {/* Stars (decorative) */}
                {[...Array(50)].map((_, i) => (
                  <circle
                    key={i}
                    cx={Math.random() * vizData.canvasWidth}
                    cy={Math.random() * vizData.canvasHeight}
                    r={Math.random() * 1.5 + 0.5}
                    fill="white"
                    opacity={Math.random() * 0.7 + 0.3}
                  />
                ))}

                {/* FOV Panels (Mosaic Grid) */}
                {vizData.panelsPx.map((panel, index) => (
                  <g key={index}>
                    <rect
                      x={panel.x - vizData.fovWidthPx / 2}
                      y={panel.y - vizData.fovHeightPx / 2}
                      width={vizData.fovWidthPx}
                      height={vizData.fovHeightPx}
                      fill="none"
                      stroke="#4dabf7"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      opacity={vizData.panelCount > 1 ? 0.7 : 1}
                    />
                    {/* Panel number */}
                    {vizData.panelCount > 1 && (
                      <text
                        x={panel.x}
                        y={panel.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#4dabf7"
                        fontSize="14"
                        fontWeight="bold"
                      >
                        {index + 1}
                      </text>
                    )}
                  </g>
                ))}

                {/* Center Crosshairs (only for single panel) */}
                {vizData.panelCount === 1 && (
                  <>
                    <line
                      x1={vizData.centerX - vizData.fovWidthPx / 2}
                      y1={vizData.centerY}
                      x2={vizData.centerX + vizData.fovWidthPx / 2}
                      y2={vizData.centerY}
                      stroke="#4dabf7"
                      strokeWidth="1"
                      opacity="0.5"
                    />
                    <line
                      x1={vizData.centerX}
                      y1={vizData.centerY - vizData.fovHeightPx / 2}
                      x2={vizData.centerX}
                      y2={vizData.centerY + vizData.fovHeightPx / 2}
                      stroke="#4dabf7"
                      strokeWidth="1"
                      opacity="0.5"
                    />
                  </>
                )}

                {/* Target Visualization */}
                {selectedTarget && vizData.targetWidthPx > 0 && (
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

                {/* Labels */}
                <text
                  x={vizData.centerX}
                  y={30}
                  textAnchor="middle"
                  fill="#4dabf7"
                  fontSize="16"
                  fontWeight="bold"
                >
                  {vizData.panelCount > 1 ? `${vizData.panelCount}-Panel Mosaic` : 'Camera Field of View'}
                </text>
                <text
                  x={vizData.centerX}
                  y={vizData.canvasHeight - 10}
                  textAnchor="middle"
                  fill="#4dabf7"
                  fontSize="12"
                >
                  {vizData.panelCount === 1
                    ? `${selectedRig?.fovWidthArcmin.toFixed(1)}′ × ${selectedRig?.fovHeightArcmin.toFixed(1)}′`
                    : `Total: ${vizData.totalWidthArcmin.toFixed(1)}′ × ${vizData.totalHeightArcmin.toFixed(1)}′ | Panel: ${selectedRig?.fovWidthArcmin.toFixed(1)}′ × ${selectedRig?.fovHeightArcmin.toFixed(1)}′`
                  }
                </text>
              </svg>
            </div>

            <Text size="sm" c="dimmed" ta="center" mt="md">
              Blue dashed rectangles: Camera FOV {vizData.panelCount > 1 && `(${vizData.panelCount} panels with ${overlapPercent}% overlap)`} •
              Red ellipse: Target size •
              {vizData.panelCount === 1 && 'Crosshairs: Center of frame'}
              {vizData.panelCount > 1 && 'Numbers: Panel sequence'}
            </Text>
          </Card>
        )}

        {!selectedRigId && (
          <Text c="dimmed" ta="center" py="xl">
            Select a rig to visualize its field of view
          </Text>
        )}
      </Stack>
    </Container>
  );
}
