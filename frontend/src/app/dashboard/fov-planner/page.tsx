'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Stack,
  Group,
  Select,
  Card,
  Text,
  Grid,
  Paper,
  NumberInput,
  Loader,
  Center,
  Button,
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
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const [rotationDeg, setRotationDeg] = useState<number>(0);
  const [fovOffsetX, setFovOffsetX] = useState<number>(0);
  const [fovOffsetY, setFovOffsetY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [hoveredCorner, setHoveredCorner] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

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

  // Calculate required image FOV for DSS request
  // Returns FOV in arcminutes that is large enough to contain either the mosaic or the target,
  // with extra buffer for dragging/repositioning
  const getRequiredImageFOV = (
    mosaicTotalArcmin: number,
    targetSizeArcmin: number | null
  ): number => {
    // Start with the larger of mosaic total FOV or target size
    const baseFOV = Math.max(
      mosaicTotalArcmin,
      targetSizeArcmin || 0
    );

    // Add 2x buffer for dragging capability
    // This gives plenty of room to reposition the FOV
    return baseFOV * 2;
  };

  // Generate DSS image URL for target
  const getDSSImageUrl = (target: Target | undefined, imageFovArcmin: number): string | null => {
    if (!target) return null;

    const raDeg = target.raDeg;
    const decDeg = target.decDeg;

    // Calculate FOV in degrees
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

    // Proxy through our image cache API for lazy caching
    return `/api/image-proxy?url=${encodeURIComponent(externalUrl)}`;
  };

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

    // Calculate the required image FOV (larger than mosaic for dragging room)
    const mosaicDiagonal = Math.sqrt(
      mosaicData.totalWidth ** 2 + mosaicData.totalHeight ** 2
    );
    const imageFovArcmin = getRequiredImageFOV(
      mosaicDiagonal,
      selectedTarget?.sizeMajorArcmin || null
    );

    // Scale factor: pixels per arcminute
    // The image FOV fills the entire canvas
    const scale = Math.min(canvasWidth, canvasHeight) / imageFovArcmin;

    // Center of canvas
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    // FOV dimensions in pixels (scaled to match image)
    const fovWidthPx = mosaicData.fovWidth * scale;
    const fovHeightPx = mosaicData.fovHeight * scale;

    // Target size in pixels (if target is selected)
    let targetWidthPx = 0;
    let targetHeightPx = 0;
    if (selectedTarget?.sizeMajorArcmin) {
      targetWidthPx = selectedTarget.sizeMajorArcmin * scale;
      targetHeightPx = selectedTarget.sizeMajorArcmin * scale;
    }

    // Panel positions in pixels (relative to center, with offset applied)
    const panelsPx = mosaicData.panels.map(p => ({
      x: centerX + (p.x + fovOffsetX) * scale,
      y: centerY + (p.y + fovOffsetY) * scale,
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
      imageFovArcmin, // Return this for DSS image request
      scale, // Return scale for drag calculations
    };
  };

  const vizData = getVisualizationData();

  // Get DSS image URL for visualization using calculated image FOV
  const dssImageUrl = vizData && selectedTarget
    ? getDSSImageUrl(selectedTarget, vizData.imageFovArcmin)
    : null;

  // Reset loading state when DSS image URL changes
  useEffect(() => {
    if (dssImageUrl) {
      setImageLoading(true);
      setImageError(false);
    } else {
      setImageLoading(false);
      setImageError(false);
    }
  }, [dssImageUrl]);

  // Reset FOV position, rotation, and zoom when target or rig changes
  useEffect(() => {
    setFovOffsetX(0);
    setFovOffsetY(0);
    setRotationDeg(0);
    setZoomLevel(1.0);
  }, [selectedRigId, selectedTargetId]);

  // Get corner positions for rotation handles
  const getCornerPositions = () => {
    if (!vizData) return [];

    const centerX = vizData.centerX + fovOffsetX * vizData.scale;
    const centerY = vizData.centerY + fovOffsetY * vizData.scale;
    const halfWidth = vizData.fovWidthPx / 2;
    const halfHeight = vizData.fovHeightPx / 2;

    // Calculate rotated corner positions
    const rad = (rotationDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    return [
      { // Top-left
        x: centerX + (-halfWidth * cos - -halfHeight * sin),
        y: centerY + (-halfWidth * sin + -halfHeight * cos),
      },
      { // Top-right
        x: centerX + (halfWidth * cos - -halfHeight * sin),
        y: centerY + (halfWidth * sin + -halfHeight * cos),
      },
      { // Bottom-right
        x: centerX + (halfWidth * cos - halfHeight * sin),
        y: centerY + (halfWidth * sin + halfHeight * cos),
      },
      { // Bottom-left
        x: centerX + (-halfWidth * cos - halfHeight * sin),
        y: centerY + (-halfWidth * sin + halfHeight * cos),
      },
    ];
  };

  // Check if mouse is near a corner
  const getNearestCorner = (mouseX: number, mouseY: number, threshold = 20): number | null => {
    const corners = getCornerPositions();
    for (let i = 0; i < corners.length; i++) {
      const dx = mouseX - corners[i].x;
      const dy = mouseY - corners[i].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < threshold) return i;
    }
    return null;
  };

  // Drag handlers for FOV repositioning and rotation
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!vizData) return;

    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const nearestCorner = getNearestCorner(mouseX, mouseY);

    if (nearestCorner !== null) {
      // Start rotation
      setIsRotating(true);
      setIsDragging(false);
    } else {
      // Start position dragging
      setIsDragging(true);
      setIsRotating(false);
    }

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!vizData) return;

    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Update hovered corner for visual feedback
    if (!isDragging && !isRotating) {
      setHoveredCorner(getNearestCorner(mouseX, mouseY));
    }

    // Handle rotation
    if (isRotating && dragStart) {
      const centerX = vizData.centerX + fovOffsetX * vizData.scale;
      const centerY = vizData.centerY + fovOffsetY * vizData.scale;

      // Calculate angle from center to mouse
      const angle = Math.atan2(mouseY - centerY, mouseX - centerX);
      const degrees = (angle * 180) / Math.PI + 90; // Adjust for 0° being top

      setRotationDeg((degrees + 360) % 360);
      return;
    }

    // Handle position dragging
    if (isDragging && dragStart) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      // Convert pixel movement to arcminutes using scale
      const offsetXArcmin = dx / vizData.scale;
      const offsetYArcmin = dy / vizData.scale;

      setFovOffsetX(fovOffsetX + offsetXArcmin);
      setFovOffsetY(fovOffsetY + offsetYArcmin);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsRotating(false);
    setDragStart(null);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setIsRotating(false);
    setDragStart(null);
    setHoveredCorner(null);
  };

  // Zoom handler for mouse wheel
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();

    // Determine zoom direction (negative deltaY = zoom in, positive = zoom out)
    const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;

    // Apply zoom with limits (0.5x to 5x)
    const newZoom = Math.min(Math.max(zoomLevel * zoomDelta, 0.5), 5.0);

    setZoomLevel(newZoom);
  };

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

            <Text size="sm" fw={500} mt="md" mb="xs" c="dimmed">
              Framing Controls
            </Text>
            <Stack gap="xs">
              <Text size="xs" c="dimmed">
                • Drag the FOV to reposition
              </Text>
              <Text size="xs" c="dimmed">
                • Drag a corner to rotate
              </Text>
              <Text size="xs" c="dimmed">
                • Scroll wheel to zoom
              </Text>
              {(fovOffsetX !== 0 || fovOffsetY !== 0 || rotationDeg !== 0 || zoomLevel !== 1.0) && (
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => {
                    setFovOffsetX(0);
                    setFovOffsetY(0);
                    setRotationDeg(0);
                    setZoomLevel(1.0);
                  }}
                >
                  Reset Framing
                </Button>
              )}
            </Stack>
            {vizData && vizData.panelCount > 1 && (
              <Paper p="sm" mt="md" withBorder bg="dark.6">
                <Group justify="space-between">
                  <Text size="sm" fw={600} c="dimmed">
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

        {vizData && (
          <Card shadow="sm" padding="lg" withBorder>
            <Text fw={600} size="lg" mb="md">
              Field of View Visualization
            </Text>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <svg
                width={vizData.canvasWidth}
                height={vizData.canvasHeight}
                style={{
                  border: '1px solid var(--mantine-color-gray-3)',
                  cursor: isRotating
                    ? 'grabbing'
                    : hoveredCorner !== null
                    ? 'grab'
                    : isDragging
                    ? 'grabbing'
                    : 'grab'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onWheel={handleWheel}
              >
                {/* Zoom wrapper - centered zoom transform */}
                <g
                  transform={`translate(${vizData.centerX}, ${vizData.centerY}) scale(${zoomLevel}) translate(${-vizData.centerX}, ${-vizData.centerY})`}
                >
                  {/* Background */}
                  {dssImageUrl ? (
                    <>
                      {/* DSS Survey Image */}
                      <image
                        href={dssImageUrl}
                        width={vizData.canvasWidth}
                        height={vizData.canvasHeight}
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
                      {/* Semi-transparent overlay for better FOV visibility */}
                      {!imageLoading && !imageError && (
                        <rect
                          width={vizData.canvasWidth}
                          height={vizData.canvasHeight}
                          fill="black"
                          opacity="0.2"
                        />
                      )}
                      {/* Loading state */}
                      {imageLoading && (
                        <>
                          <rect width={vizData.canvasWidth} height={vizData.canvasHeight} fill="#0a0e27" />
                          <foreignObject
                            x={vizData.canvasWidth / 2 - 50}
                            y={vizData.canvasHeight / 2 - 50}
                            width={100}
                            height={100}
                          >
                            <Center style={{ width: '100%', height: '100%' }}>
                              <Loader color="blue" size="lg" />
                            </Center>
                          </foreignObject>
                        </>
                      )}
                      {/* Error state - fallback to starry background */}
                      {imageError && (
                        <>
                          <rect width={vizData.canvasWidth} height={vizData.canvasHeight} fill="#0a0e27" />
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
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Fallback: Dark starry background */}
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
                    </>
                  )}

                  {/* FOV Panels (Mosaic Grid) - with rotation */}
                  <g transform={`rotate(${rotationDeg}, ${vizData.centerX}, ${vizData.centerY})`}>
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
                        x1={vizData.centerX + fovOffsetX * vizData.scale - vizData.fovWidthPx / 2}
                        y1={vizData.centerY + fovOffsetY * vizData.scale}
                        x2={vizData.centerX + fovOffsetX * vizData.scale + vizData.fovWidthPx / 2}
                        y2={vizData.centerY + fovOffsetY * vizData.scale}
                        stroke="#4dabf7"
                        strokeWidth="1"
                        opacity="0.5"
                      />
                      <line
                        x1={vizData.centerX + fovOffsetX * vizData.scale}
                        y1={vizData.centerY + fovOffsetY * vizData.scale - vizData.fovHeightPx / 2}
                        x2={vizData.centerX + fovOffsetX * vizData.scale}
                        y2={vizData.centerY + fovOffsetY * vizData.scale + vizData.fovHeightPx / 2}
                        stroke="#4dabf7"
                        strokeWidth="1"
                        opacity="0.5"
                      />
                    </>
                  )}

                  {/* Corner handles for rotation */}
                  {getCornerPositions().map((corner, index) => (
                    <circle
                      key={index}
                      cx={corner.x}
                      cy={corner.y}
                      r={hoveredCorner === index ? 8 : 6}
                      fill={hoveredCorner === index ? '#4dabf7' : '#1971c2'}
                      stroke="#ffffff"
                      strokeWidth="2"
                      opacity={hoveredCorner === index ? 1 : 0.7}
                      style={{ cursor: 'grab', pointerEvents: 'all' }}
                    />
                  ))}
                </g>

                {/* Target Label (only show if no DSS image) */}
                {selectedTarget && !dssImageUrl && vizData.targetWidthPx > 0 && (
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
                {selectedTarget && dssImageUrl && (
                  <text
                    x={vizData.centerX}
                    y={vizData.canvasHeight - 30}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="16"
                    fontWeight="bold"
                    style={{ textShadow: '0 0 4px black, 0 0 8px black' }}
                  >
                    {selectedTarget.name}
                    {selectedTarget.catalogId && ` (${selectedTarget.catalogId})`}
                  </text>
                )}
                </g>
                {/* End of zoom wrapper */}

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
