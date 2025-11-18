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

  // Calculate scale factor for visualization
  const getVisualizationData = () => {
    if (!selectedRig) return null;

    const canvasWidth = 600;
    const canvasHeight = 400;

    // FOV in pixels (scale down to fit canvas)
    const fovWidthPx = canvasWidth * 0.8;
    const fovHeightPx = canvasHeight * 0.8;

    // Scale: pixels per arcminute
    const scaleX = fovWidthPx / selectedRig.fovWidthArcmin;
    const scaleY = fovHeightPx / selectedRig.fovHeightArcmin;

    // Center of canvas
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    // Target size in pixels (if target is selected)
    let targetWidthPx = 0;
    let targetHeightPx = 0;
    if (selectedTarget?.sizeMajorArcmin) {
      targetWidthPx = selectedTarget.sizeMajorArcmin * scaleX;
      targetHeightPx = selectedTarget.sizeMajorArcmin * scaleY;
    }

    return {
      canvasWidth,
      canvasHeight,
      fovWidthPx,
      fovHeightPx,
      centerX,
      centerY,
      targetWidthPx,
      targetHeightPx,
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

                {/* FOV Rectangle */}
                <rect
                  x={vizData.centerX - vizData.fovWidthPx / 2}
                  y={vizData.centerY - vizData.fovHeightPx / 2}
                  width={vizData.fovWidthPx}
                  height={vizData.fovHeightPx}
                  fill="none"
                  stroke="#4dabf7"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />

                {/* FOV Crosshairs */}
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
                  Camera Field of View
                </text>
                <text
                  x={vizData.centerX}
                  y={vizData.canvasHeight - 10}
                  textAnchor="middle"
                  fill="#4dabf7"
                  fontSize="12"
                >
                  {selectedRig?.fovWidthArcmin.toFixed(1)}′ × {selectedRig?.fovHeightArcmin.toFixed(1)}′
                </text>
              </svg>
            </div>

            <Text size="sm" c="dimmed" ta="center" mt="md">
              Blue dashed rectangle: Camera field of view • Red ellipse: Target size •
              Crosshairs: Center of frame
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
