'use client';

import { useState, useEffect, useMemo } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
import {
  Container,
  Title,
  TextInput,
  Select,
  Stack,
  Group,
  Text,
  Badge,
  ActionIcon,
  Tooltip,
  Paper,
  Image,
  RangeSlider,
  Collapse,
  Button,
  Box,
  Divider,
  Modal,
  Loader,
  Center,
  Checkbox,
  Menu,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { List } from 'react-window';
import { useSession } from 'next-auth/react';
import {
  IconSearch,
  IconPlus,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconFilter,
  IconMapPin,
  IconAlertCircle,
  IconArrowsSort,
  IconSelector,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import {
  calculateAltitudeOverTime,
  getDirectionFromAzimuth,
  calculateMoonAltitudeOverTime,
  checkMoonInterference,
  getSafeMoonSeparation,
  calculateSunAltitudeOverTime,
  calculatePlanetPosition,
} from '@/utils/visibility';

interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  isFavorite: boolean;
}

interface Rig {
  id: string;
  name: string;
  fovWidthArcmin: number;
  fovHeightArcmin: number;
  pixelScale: number;
  telescope: { name: string };
  camera: { name: string };
}

interface Target {
  id: string;
  catalogId: string | null;
  name: string;
  type: string;
  subType?: string | null;
  raDeg: number;
  decDeg: number;
  sizeMajorArcmin: number | null;
  sizeMinorArcmin: number | null;
  magnitude: number | null;
  constellation: string | null;
  messierId: string | null;
  isDynamic?: boolean; // True for planets, moon, comets
  solarSystemBody?: string | null; // "Mercury", "Venus", etc.
  dynamicRaDeg?: number; // Calculated RA for dynamic objects
  dynamicDecDeg?: number; // Calculated Dec for dynamic objects
  currentAltitude?: number;
  currentAzimuth?: number;
  isCurrentlyVisible?: boolean;
  previewImageUrl?: string | null;
  thumbnailUrl?: string | null;
}

interface TargetsResponse {
  targets: Target[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function fetchLocations(): Promise<Location[]> {
  const response = await fetch('/api/locations');
  if (!response.ok) throw new Error('Failed to fetch locations');
  return response.json();
}

async function fetchRigs(): Promise<Rig[]> {
  const response = await fetch('/api/rigs');
  if (!response.ok) throw new Error('Failed to fetch rigs');
  return response.json();
}

async function fetchTargets(params: {
  page: number;
  search: string;
  types: string[];
  constellation: string;
  latitude?: number;
  longitude?: number;
  magnitudeMin?: number;
  magnitudeMax?: number;
  sortBy?: string;
  sortDirection?: string;
  date?: Date;
  applyAdvancedFilters?: boolean;
  timeWindow?: [number, number];
  altitudeRange?: [number, number];
  azimuthSegments?: boolean[];
  rigId?: string;
  fovCoverageRange?: [number, number];
}): Promise<TargetsResponse> {
  const searchParams = new URLSearchParams({
    page: params.page.toString(),
    limit: '12',
    ...(params.search && { search: params.search }),
    ...(params.types.length > 0 && { type: params.types.join(',') }),
    ...(params.constellation && { constellation: params.constellation }),
    ...(params.latitude !== undefined && { latitude: params.latitude.toString() }),
    ...(params.longitude !== undefined && { longitude: params.longitude.toString() }),
    ...(params.magnitudeMin !== undefined && { magnitudeMin: params.magnitudeMin.toString() }),
    ...(params.magnitudeMax !== undefined && { magnitudeMax: params.magnitudeMax.toString() }),
    ...(params.sortBy && { sortBy: params.sortBy }),
    ...(params.sortDirection && { sortDirection: params.sortDirection }),
    ...(params.date && { date: params.date.toISOString() }),
    ...(params.applyAdvancedFilters !== undefined && { applyAdvancedFilters: params.applyAdvancedFilters.toString() }),
    ...(params.timeWindow && { timeWindowStart: params.timeWindow[0].toString(), timeWindowEnd: params.timeWindow[1].toString() }),
    ...(params.altitudeRange && { altitudeMin: params.altitudeRange[0].toString(), altitudeMax: params.altitudeRange[1].toString() }),
    ...(params.azimuthSegments && { azimuthSegments: params.azimuthSegments.map(s => s ? '1' : '0').join('') }),
    ...(params.rigId && { rigId: params.rigId }),
    ...(params.fovCoverageRange && { fovCoverageMin: params.fovCoverageRange[0].toString(), fovCoverageMax: params.fovCoverageRange[1].toString() }),
  });

  const url = `/api/targets?${searchParams}`;
  console.log('🔍 Fetching targets with URL:', url);
  console.log('📝 Search param:', params.search);

  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch targets');
  const data = await response.json();
  console.log('✅ Received targets:', data.targets.length, 'Total:', data.pagination.total);
  return data;
}

async function addToWishlist(targetId: string): Promise<void> {
  const response = await fetch('/api/user-targets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetId, status: 'WISHLIST' }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add target');
  }
}

function VisibilityChart({
  target,
  location,
  showMoonOverlay = true,
  selectedDate,
}: {
  target: Target;
  location: Location;
  showMoonOverlay?: boolean;
  selectedDate: Date;
}) {
  const [hoverX, setHoverX] = useState<number | null>(null);

  // Start from midnight of selected day
  const startOfDay = new Date(selectedDate);
  startOfDay.setHours(0, 0, 0, 0);

  // For dynamic objects, use calculated position if available, otherwise calculate
  let targetCoords = { raDeg: target.raDeg, decDeg: target.decDeg };

  // Use pre-calculated dynamic coordinates from API if available (comets, planets, moon)
  if (target.dynamicRaDeg !== undefined && target.dynamicDecDeg !== undefined) {
    targetCoords = { raDeg: target.dynamicRaDeg, decDeg: target.dynamicDecDeg };
  }
  // Fallback: Calculate planet/moon position if solarSystemBody is set
  else if (target.isDynamic && target.solarSystemBody) {
    targetCoords = calculatePlanetPosition(target.solarSystemBody, startOfDay);
  }

  const points = calculateAltitudeOverTime(
    targetCoords,
    { latitude: location.latitude, longitude: location.longitude },
    startOfDay,
    24, // Full 24 hours
    30  // 30-minute intervals
  );

  // Calculate sun position over time for twilight zones
  const sunPoints = calculateSunAltitudeOverTime(
    { latitude: location.latitude, longitude: location.longitude },
    startOfDay,
    24,
    30
  );

  // Calculate moon position and angular separation over time (only if overlay is enabled)
  const moonData: Array<{
    time: Date;
    separation: number;
    illumination: number;
    moonAltitude: number;
    safeDistance: number;
  }> = [];

  if (showMoonOverlay) {
    const moonPoints = calculateMoonAltitudeOverTime(
      { latitude: location.latitude, longitude: location.longitude },
      startOfDay,
      24,
      30
    );

    points.forEach((targetPoint, i) => {
      const moonPoint = moonPoints[i];
      if (!moonPoint) return;

      const interference = checkMoonInterference(
        { altitude: targetPoint.altitude, azimuth: targetPoint.azimuth },
        { altitude: moonPoint.altitude, azimuth: moonPoint.azimuth },
        moonPoint.illumination
      );

      moonData.push({
        time: targetPoint.time,
        separation: interference.separation,
        illumination: moonPoint.illumination,
        moonAltitude: moonPoint.altitude,
        safeDistance: interference.safeDistance,
      });
    });
  }

  // Check for moon interference zones (only if overlay is enabled)
  const interferenceZones: Array<{ startIndex: number; endIndex: number; severity: number }> = [];

  if (showMoonOverlay && moonData.length > 0) {
    let interferenceStart: number | null = null;

    moonData.forEach((data, i) => {
      const interferes = data.separation < data.safeDistance && data.moonAltitude > 0;

      if (interferes) {
        if (interferenceStart === null) {
          interferenceStart = i;
        }
      } else if (interferenceStart !== null) {
        interferenceZones.push({
          startIndex: interferenceStart,
          endIndex: i - 1,
          severity: moonData[interferenceStart].illumination,
        });
        interferenceStart = null;
      }
    });

    // Close any open interference zone
    if (interferenceStart !== null) {
      interferenceZones.push({
        startIndex: interferenceStart,
        endIndex: moonData.length - 1,
        severity: moonData[moonData.length - 1].illumination,
      });
    }
  }

  const maxAlt = Math.max(...points.map(p => p.altitude));
  const maxAltPoint = points.find(p => p.altitude === maxAlt);
  const chartHeight = 160;
  const chartWidth = 500; // Wider chart
  const maxAltScale = 100; // Extend scale to 100° to give headroom above 90°

  // Helper function to convert hour (0-24) to shifted position (0-1) with midnight centered
  // Display: 12h (noon) at left → 00h (midnight) at center → 12h (noon) at right
  const getShiftedPosition = (hour: number): number => {
    // Shift by 12 hours to center midnight
    return hour >= 12 ? (hour - 12) / 24 : (hour + 12) / 24;
  };

  // Calculate current time position with midnight centered (only if viewing today)
  const now = new Date();
  const isToday = startOfDay.toDateString() === new Date().toDateString();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const currentTimePosition = getShiftedPosition(currentHour);

  // Check if target ever rises above horizon
  const targetEverVisible = maxAlt > 0;

  // Moon phase helper functions
  const getMoonPhase = (illum: number): string => {
    if (illum < 0.05) return 'New Moon';
    if (illum < 0.25) return 'Waxing Crescent';
    if (illum < 0.35) return 'First Quarter';
    if (illum < 0.65) return 'Waxing Gibbous';
    if (illum < 0.75) return 'Full Moon';
    if (illum < 0.95) return 'Waning Gibbous';
    return 'Waning Crescent';
  };

  const getMoonEmoji = (illum: number): string => {
    if (illum < 0.05) return '🌑'; // New Moon
    if (illum < 0.25) return '🌒'; // Waxing Crescent
    if (illum < 0.35) return '🌓'; // First Quarter
    if (illum < 0.65) return '🌔'; // Waxing Gibbous
    if (illum < 0.75) return '🌕'; // Full Moon
    if (illum < 0.95) return '🌖'; // Waning Gibbous
    return '🌘'; // Waning Crescent
  };

  // Moon phase description and check if moon ever gets close to target
  const currentMoonIllumination = moonData[0]?.illumination || 0;
  const minSeparation = moonData.length > 0 ? Math.min(...moonData.map(d => d.separation)) : 999;
  const safeDistance = getSafeMoonSeparation(currentMoonIllumination);
  const moonComesNearTarget = minSeparation < safeDistance; // Show moon curve only if it comes within safe distance

  // Find highest point of moon for icon placement
  const maxMoonAlt = moonData.length > 0 ? Math.max(...moonData.map(d => d.moonAltitude)) : 0;
  const maxMoonPoint = moonData.find(d => d.moonAltitude === maxMoonAlt);

  // Calculate hover info with shifted time axis (midnight centered)
  const getHoverInfo = (x: number) => {
    const shiftedProgress = x / chartWidth; // 0 to 1 on shifted axis

    // Convert back to actual hours (reverse the shift)
    // shiftedProgress 0 = hour 12, 0.5 = hour 0, 1.0 = hour 12 (next day)
    const actualHour = shiftedProgress < 0.5
      ? shiftedProgress * 24 + 12  // Left half: 12-24
      : (shiftedProgress - 0.5) * 24;  // Right half: 0-12

    const hoverTime = new Date(startOfDay.getTime() + actualHour * 60 * 60 * 1000);

    // Find closest data point
    const pointIndex = Math.round((actualHour / 24) * (points.length - 1));
    const point = points[pointIndex];

    // Check for moon interference at this time (but not when target is the Moon itself)
    let moonInterference = null;
    if (showMoonOverlay && target.solarSystemBody !== 'Moon' && moonData.length > 0 && moonData[pointIndex]) {
      const moonPoint = moonData[pointIndex];
      const hasInterference = moonPoint.separation < moonPoint.safeDistance && moonPoint.moonAltitude > 0;
      if (hasInterference) {
        moonInterference = {
          separation: moonPoint.separation,
          safeDistance: moonPoint.safeDistance,
          illumination: moonPoint.illumination,
        };
      }
    }

    return {
      time: hoverTime,
      altitude: point?.altitude || 0,
      azimuth: point?.azimuth || 0,
      moonInterference,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;

    if (x >= 0 && x <= chartWidth) {
      setHoverX(x);
    }
  };

  const handleMouseLeave = () => {
    setHoverX(null);
  };

  const hoverInfo = hoverX !== null ? getHoverInfo(hoverX) : null;

  return (
    <Box style={{ position: 'relative', width: chartWidth, height: chartHeight + 35 }}>
      <Text size="xs" fw={600} mb={1}>
        Alt/°
      </Text>
      <svg
        width={chartWidth}
        height={chartHeight}
        style={{ display: 'block', backgroundColor: 'var(--mantine-color-dark-8)', borderRadius: 4, cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Twilight zones (colored background based on sun position) */}
        {sunPoints.map((sunPoint, i) => {
          if (i === 0) return null; // Skip first point

          const prevSunPoint = sunPoints[i - 1];
          // Calculate shifted position for twilight zones (midnight centered)
          const actualProgress = (i - 1) / (sunPoints.length - 1); // 0-1 in actual time
          const actualHour = actualProgress * 24;
          const x = getShiftedPosition(actualHour) * chartWidth;
          const width = chartWidth / (sunPoints.length - 1);

          // Determine color based on sun altitude
          let color = null;
          let opacity = 0;

          const sunAlt = (sunPoint.altitude + prevSunPoint.altitude) / 2; // Average of two points

          if (sunAlt > 0) {
            // Daytime - light blue overlay
            color = 'var(--mantine-color-blue-3)';
            opacity = 0.15;
          } else if (sunAlt > -6) {
            // Civil twilight - lighter overlay
            color = 'var(--mantine-color-blue-4)';
            opacity = 0.10;
          } else if (sunAlt > -12) {
            // Nautical twilight - medium overlay
            color = 'var(--mantine-color-blue-5)';
            opacity = 0.07;
          } else if (sunAlt > -18) {
            // Astronomical twilight - darker overlay (marginal for astrophotography)
            color = 'var(--mantine-color-blue-6)';
            opacity = 0.04;
          }
          // Below -18° (astronomical night) - no overlay, perfect for astrophotography

          if (!color) return null;

          return (
            <rect
              key={`twilight-${i}`}
              x={x}
              y={0}
              width={width + 1} // Slight overlap to avoid gaps
              height={chartHeight}
              fill={color}
              opacity={opacity}
            />
          );
        })}

        {/* Altitude grid lines (horizontal) */}
        {[0, 30, 60, 90].map((alt) => (
          <g key={alt}>
            <line
              x1="0"
              y1={chartHeight - (alt / maxAltScale) * chartHeight}
              x2={chartWidth}
              y2={chartHeight - (alt / maxAltScale) * chartHeight}
              stroke="var(--mantine-color-dark-5)"
              strokeWidth="1"
              opacity="0.3"
            />
            <text
              x="5"
              y={chartHeight - (alt / maxAltScale) * chartHeight - 3}
              fill="var(--mantine-color-dimmed)"
              fontSize="10"
            >
              {alt}
            </text>
          </g>
        ))}

        {/* Time grid lines (vertical) - every 4 hours, centered on midnight */}
        {[12, 16, 20, 0, 4, 8, 12].map((hour, idx) => (
          <line
            key={`${hour}-${idx}`}
            x1={getShiftedPosition(hour === 12 && idx === 6 ? 24 : hour) * chartWidth}
            y1={0}
            x2={getShiftedPosition(hour === 12 && idx === 6 ? 24 : hour) * chartWidth}
            y2={chartHeight}
            stroke="var(--mantine-color-dark-5)"
            strokeWidth="1"
            opacity="0.3"
          />
        ))}

        {/* Moon interference zones (shaded areas) - don't show when target is the Moon itself */}
        {showMoonOverlay && target.solarSystemBody !== 'Moon' &&
          interferenceZones.map((zone, idx) => {
            const startHour = (zone.startIndex / (points.length - 1)) * 24;
            const endHour = (zone.endIndex / (points.length - 1)) * 24;
            const startX = getShiftedPosition(startHour) * chartWidth;
            const endX = getShiftedPosition(endHour) * chartWidth;
            const opacity = 0.1 + zone.severity * 0.2; // More opaque for brighter moon

            return (
              <rect
                key={`interference-${idx}`}
                x={Math.min(startX, endX)}
                y={0}
                width={Math.abs(endX - startX)}
                height={chartHeight}
                fill="var(--mantine-color-yellow-5)"
                opacity={opacity}
              />
            );
          })}

        {/* Altitude curve - split into two segments to avoid horizontal line with shifted axis */}
        {(() => {
          const midpoint = Math.floor(points.length / 2);

          // First segment: second half of day (hours 12-24, displayed on left)
          const firstSegment = points.slice(midpoint).map((p, i) => {
            const actualIndex = midpoint + i;
            const hour = (actualIndex / (points.length - 1)) * 24;
            const x = getShiftedPosition(hour) * chartWidth;
            const y = chartHeight - (Math.max(0, p.altitude) / maxAltScale) * chartHeight;
            return `${x},${y}`;
          }).join(' ');

          // Second segment: first half of day (hours 0-12, displayed on right)
          // For the endpoint, manually position at right edge (chartWidth)
          const secondSegment = points.slice(0, midpoint + 1).map((p, i) => {
            const hour = (i / (points.length - 1)) * 24;
            // If this is the last point (hour 12), position at right edge
            const x = i === midpoint ? chartWidth : getShiftedPosition(hour) * chartWidth;
            const y = chartHeight - (Math.max(0, p.altitude) / maxAltScale) * chartHeight;
            return `${x},${y}`;
          }).join(' ');

          return (
            <>
              <polyline
                points={firstSegment}
                fill="none"
                stroke="var(--mantine-color-blue-4)"
                strokeWidth="2"
              />
              <polyline
                points={secondSegment}
                fill="none"
                stroke="var(--mantine-color-blue-4)"
                strokeWidth="2"
              />
            </>
          );
        })()}

        {/* Moon altitude curve (white dotted line) - only show if target is visible and moon comes near, and target is not the Moon itself */}
        {showMoonOverlay && targetEverVisible && moonComesNearTarget && moonData.length > 0 && target.solarSystemBody !== 'Moon' && (
          <>
            {/* Moon curve - split into two segments to avoid horizontal line */}
            {(() => {
              const midpoint = Math.floor(moonData.length / 2);

              // First segment: second half of day (hours 12-24)
              const firstSegment = moonData.slice(midpoint).map((p, i) => {
                const actualIndex = midpoint + i;
                const hour = (actualIndex / (moonData.length - 1)) * 24;
                const x = getShiftedPosition(hour) * chartWidth;
                const y = chartHeight - (Math.max(0, p.moonAltitude) / maxAltScale) * chartHeight;
                return `${x},${y}`;
              }).join(' ');

              // Second segment: first half of day (hours 0-12)
              // For the endpoint, manually position at right edge (chartWidth)
              const secondSegment = moonData.slice(0, midpoint + 1).map((p, i) => {
                const hour = (i / (moonData.length - 1)) * 24;
                // If this is the last point (hour 12), position at right edge
                const x = i === midpoint ? chartWidth : getShiftedPosition(hour) * chartWidth;
                const y = chartHeight - (Math.max(0, p.moonAltitude) / maxAltScale) * chartHeight;
                return `${x},${y}`;
              }).join(' ');

              return (
                <>
                  <polyline
                    points={firstSegment}
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    opacity="0.7"
                  />
                  <polyline
                    points={secondSegment}
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    opacity="0.7"
                  />
                </>
              );
            })()}

            {/* Moon phase emoji at highest point */}
            {maxMoonPoint && maxMoonAlt > 0 && (
              <text
                x={getShiftedPosition((moonData.indexOf(maxMoonPoint) / (moonData.length - 1)) * 24) * chartWidth}
                y={chartHeight - (Math.max(0, maxMoonAlt) / maxAltScale) * chartHeight - 8}
                fontSize="16"
                textAnchor="middle"
                style={{ userSelect: 'none' }}
              >
                {getMoonEmoji(currentMoonIllumination)}
              </text>
            )}
          </>
        )}

        {/* Horizon line at bottom - render after altitude curves so it appears on top */}
        <line
          x1="0"
          y1={chartHeight}
          x2={chartWidth}
          y2={chartHeight}
          stroke="var(--mantine-color-orange-7)"
          strokeWidth="2"
        />

        {/* Current time marker - small red striped line (only show if viewing today) */}
        {isToday && (
          <line
            x1={currentTimePosition * chartWidth}
            y1="0"
            x2={currentTimePosition * chartWidth}
            y2={chartHeight}
            stroke="var(--mantine-color-red-6)"
            strokeWidth="2"
            strokeDasharray="3,3"
          />
        )}

        {/* Meridian crossing (transit) - dotted line */}
        {maxAltPoint && maxAlt > 0 && (
          <>
            <line
              x1={getShiftedPosition((points.indexOf(maxAltPoint) / (points.length - 1)) * 24) * chartWidth}
              y1="-15"
              x2={getShiftedPosition((points.indexOf(maxAltPoint) / (points.length - 1)) * 24) * chartWidth}
              y2={chartHeight + 5}
              stroke="var(--mantine-color-orange-5)"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
            <circle
              cx={getShiftedPosition((points.indexOf(maxAltPoint) / (points.length - 1)) * 24) * chartWidth}
              cy={chartHeight - (Math.max(0, maxAlt) / maxAltScale) * chartHeight}
              r="3"
              fill="var(--mantine-color-orange-5)"
            />
            <text
              x={getShiftedPosition((points.indexOf(maxAltPoint) / (points.length - 1)) * 24) * chartWidth}
              y="10"
              fill="var(--mantine-color-orange-5)"
              fontSize="11"
              fontWeight="600"
              textAnchor="middle"
            >
              {maxAltPoint.time.getHours().toString().padStart(2, '0')}:
              {maxAltPoint.time.getMinutes().toString().padStart(2, '0')}
            </text>
          </>
        )}

        {/* Hover crosshair */}
        {hoverX !== null && hoverInfo && (
          <>
            {/* Vertical line following mouse */}
            <line
              x1={hoverX}
              y1="0"
              x2={hoverX}
              y2={chartHeight}
              stroke="var(--mantine-color-cyan-4)"
              strokeWidth="1"
              strokeDasharray="2,2"
              opacity="0.8"
            />

            {/* Hover point on curve */}
            <circle
              cx={hoverX}
              cy={chartHeight - (Math.max(0, hoverInfo.altitude) / maxAltScale) * chartHeight}
              r="4"
              fill="var(--mantine-color-cyan-4)"
              stroke="white"
              strokeWidth="1"
            />

            {/* Tooltip background */}
            <rect
              x={hoverX > chartWidth / 2 ? hoverX - 110 : hoverX + 10}
              y={20}
              width={100}
              height={hoverInfo.moonInterference ? 58 : 40}
              fill="var(--mantine-color-dark-6)"
              stroke="var(--mantine-color-cyan-4)"
              strokeWidth="1"
              rx="4"
              opacity="0.95"
            />

            {/* Tooltip text - Time */}
            <text
              x={hoverX > chartWidth / 2 ? hoverX - 60 : hoverX + 60}
              y={35}
              fill="white"
              fontSize="11"
              textAnchor="middle"
              fontWeight="600"
            >
              {hoverInfo.time.getHours().toString().padStart(2, '0')}:
              {hoverInfo.time.getMinutes().toString().padStart(2, '0')}
            </text>

            {/* Tooltip text - Altitude */}
            <text
              x={hoverX > chartWidth / 2 ? hoverX - 60 : hoverX + 60}
              y={52}
              fill="var(--mantine-color-cyan-4)"
              fontSize="11"
              textAnchor="middle"
              fontWeight="600"
            >
              {hoverInfo.altitude.toFixed(1)}° alt
            </text>

            {/* Tooltip text - Moon Interference */}
            {hoverInfo.moonInterference && (
              <text
                x={hoverX > chartWidth / 2 ? hoverX - 60 : hoverX + 60}
                y={68}
                fill="var(--mantine-color-yellow-5)"
                fontSize="10"
                textAnchor="middle"
                fontWeight="600"
              >
                ⚠️ Moon {hoverInfo.moonInterference.separation.toFixed(1)}° away
              </text>
            )}
          </>
        )}
      </svg>

      {/* Time labels and moon phase info - centered on midnight */}
      <Box style={{ position: 'relative', width: chartWidth, height: 40 }}>
        <Group justify="space-between" mt={4} style={{ width: chartWidth }}>
          {[12, 18, 0, 6, 12].map((hour, idx) => (
            <Text key={`${hour}-${idx}`} size="xs" c="dimmed">
              {hour.toString().padStart(2, '0')}h
            </Text>
          ))}
        </Group>
      </Box>
    </Box>
  );
}

function MoonPhaseDisplay({ illumination, hasInterference }: { illumination: number; hasInterference?: boolean }) {
  const size = 60;
  const center = size / 2;
  const radius = size / 2 - 3;

  // Calculate moon phase
  const getMoonPhase = (illum: number): string => {
    if (illum < 0.03) return 'New Moon';
    if (illum < 0.25) return 'Waxing Crescent';
    if (illum < 0.35) return 'First Quarter';
    if (illum < 0.65) return 'Waxing Gibbous';
    if (illum < 0.75) return 'Full Moon';
    if (illum < 0.97) return 'Waning Gibbous';
    return 'Waning Crescent';
  };

  return (
    <Stack gap="xs" align="center">
      <svg width={size} height={size}>
        {/* Background circle (always dark) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="var(--mantine-color-dark-6)"
          stroke="var(--mantine-color-dark-4)"
          strokeWidth="2"
        />

        {/* Illuminated portion - clips the bright side */}
        {illumination > 0.01 && (
          <g>
            {/* Full bright circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="var(--mantine-color-yellow-3)"
              clipPath="url(#moonClip)"
            />

            {/* Clip path - defines visible crescent */}
            <defs>
              <clipPath id="moonClip">
                {(() => {
                  const ellipseWidth = radius * (illumination <= 0.5 ? illumination * 2 : (1 - illumination) * 2);
                  // Position ellipse so it starts from the edge
                  const ellipseCx = illumination <= 0.5
                    ? center - radius + ellipseWidth  // Waxing: start from left edge
                    : center + radius - ellipseWidth;  // Waning: start from right edge

                  return (
                    <ellipse
                      cx={ellipseCx}
                      cy={center}
                      rx={ellipseWidth}
                      ry={radius}
                    />
                  );
                })()}
              </clipPath>
            </defs>
          </g>
        )}
      </svg>

      <Stack gap={2} align="center">
        <Text size="xs" fw={500}>
          {getMoonPhase(illumination)}
        </Text>
        <Text size="xs" c="dimmed" style={{ fontSize: '10px' }}>
          {(illumination * 100).toFixed(1)}%
        </Text>
        {hasInterference && (
          <Badge size="xs" color="yellow" variant="light">
            ⚠️ Interference
          </Badge>
        )}
      </Stack>
    </Stack>
  );
}

function DirectionCompass({ azimuth }: { azimuth: number }) {
  const size = 80;
  const center = size / 2;
  const radius = size / 2 - 10;

  // Calculate arrow endpoint
  const angle = (azimuth - 90) * (Math.PI / 180); // -90 to start from North
  const arrowX = center + radius * 0.7 * Math.cos(angle);
  const arrowY = center + radius * 0.7 * Math.sin(angle);

  return (
    <Box style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ display: 'block' }}>
        {/* Compass circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--mantine-color-dark-4)"
          strokeWidth="2"
        />

        {/* Cardinal directions */}
        <text x={center} y={15} fill="var(--mantine-color-gray-5)" fontSize="12" textAnchor="middle" fontWeight="bold">N</text>
        <text x={size - 10} y={center + 5} fill="var(--mantine-color-gray-6)" fontSize="10" textAnchor="middle">E</text>
        <text x={center} y={size - 5} fill="var(--mantine-color-gray-6)" fontSize="10" textAnchor="middle">S</text>
        <text x={10} y={center + 5} fill="var(--mantine-color-gray-6)" fontSize="10" textAnchor="middle">W</text>

        {/* Direction arrow */}
        <line
          x1={center}
          y1={center}
          x2={arrowX}
          y2={arrowY}
          stroke="var(--mantine-color-blue-5)"
          strokeWidth="3"
          markerEnd="url(#arrowhead)"
        />

        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="5"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="var(--mantine-color-blue-5)" />
          </marker>
        </defs>
      </svg>
      <Text size="xs" ta="center" c="dimmed" mt={-4}>
        {azimuth.toFixed(0)}° {getDirectionFromAzimuth(azimuth)}
      </Text>
    </Box>
  );
}

export default function TargetsPage(): JSX.Element {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedGear, setSelectedGear] = useState<Rig | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300); // 300ms debounce
  const [types, setTypes] = useState<string[]>([]);
  const [constellation, setConstellation] = useState('');
  const [magnitudeRange, setMagnitudeRange] = useState<[number, number]>([-15, 25]); // Cover full range: -12.7 to 21.01
  const [timeWindow, setTimeWindow] = useState<[number, number]>([12, 36]); // 12h to 36h (full 24h range)
  const [altitudeRange, setAltitudeRange] = useState<[number, number]>([0, 90]);
  const [azimuthSegments, setAzimuthSegments] = useState<boolean[]>(Array(24).fill(true)); // 24 segments of 15° each
  const [enableFOVFilter, setEnableFOVFilter] = useState(true);
  const [fovCoverageRange, setFovCoverageRange] = useState<[number, number]>([10, 200]);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [applyAdvancedFilters, setApplyAdvancedFilters] = useState(false); // Toggle for advanced visibility filtering
  const showMoonOverlay = true; // Always show moon overlay
  const [sortBy, setSortBy] = useState<'magnitude' | 'size' | 'tonights-best'>('tonights-best');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [addedTargets, setAddedTargets] = useState<Set<string>>(new Set());
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImageTarget, setSelectedImageTarget] = useState<Target | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [loadingDots, setLoadingDots] = useState('.');

  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
  });

  const { data: rigs } = useQuery({
    queryKey: ['rigs'],
    queryFn: fetchRigs,
  });

  // Auto-select favorite location
  useEffect(() => {
    if (locations && !selectedLocation) {
      const favorite = locations.find((loc) => loc.isFavorite);
      if (favorite) {
        setSelectedLocation(favorite);
      } else if (locations.length > 0) {
        setSelectedLocation(locations[0]);
      }
    }
  }, [locations, selectedLocation]);

  // Removed page state - using infinite scroll now

  // Calculate current moon phase
  const currentMoonPhase = useMemo(() => {
    if (!selectedLocation) return null;

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const moonPoints = calculateMoonAltitudeOverTime(
      { latitude: selectedLocation.latitude, longitude: selectedLocation.longitude },
      startOfDay,
      24,
      30
    );

    if (moonPoints.length === 0) return null;

    // Get current hour to find the closest moon point (for selected date)
    const now = new Date();
    const isToday = startOfDay.toDateString() === now.toDateString();
    const currentHour = isToday ? (now.getHours() + now.getMinutes() / 60) : 12; // Default to noon if not today
    const pointIndex = Math.floor((currentHour / 24) * moonPoints.length);
    const currentPoint = moonPoints[pointIndex] || moonPoints[0];

    return {
      illumination: currentPoint.illumination,
      altitude: currentPoint.altitude,
    };
  }, [selectedLocation, selectedDate]);

  const {
    data: infiniteData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [
      'targets',
      debouncedSearch, // Use debounced search for query key
      types,
      constellation,
      selectedLocation?.latitude,
      selectedLocation?.longitude,
      magnitudeRange,
      sortBy,
      sortDirection,
      selectedDate.toISOString(),
      applyAdvancedFilters,
      timeWindow,
      altitudeRange,
      azimuthSegments,
      selectedGear?.id,
      enableFOVFilter,
      fovCoverageRange,
    ],
    queryFn: ({ pageParam = 1 }) =>
      fetchTargets({
        page: pageParam,
        search: debouncedSearch, // Use debounced search for API call
        types,
        constellation,
        latitude: selectedLocation?.latitude,
        longitude: selectedLocation?.longitude,
        // Only send magnitude filters if advanced filters are enabled
        magnitudeMin: applyAdvancedFilters ? magnitudeRange[0] : undefined,
        magnitudeMax: applyAdvancedFilters ? magnitudeRange[1] : undefined,
        sortBy,
        sortDirection,
        date: selectedDate,
        // Pass advanced filter parameters
        applyAdvancedFilters,
        timeWindow: applyAdvancedFilters ? timeWindow : undefined,
        altitudeRange: applyAdvancedFilters ? altitudeRange : undefined,
        azimuthSegments: applyAdvancedFilters ? azimuthSegments : undefined,
        rigId: (applyAdvancedFilters && enableFOVFilter) ? selectedGear?.id : undefined,
        fovCoverageRange: (applyAdvancedFilters && enableFOVFilter) ? fovCoverageRange : undefined,
      }),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    enabled: !!selectedLocation,
    initialPageParam: 1,
    // Performance optimization: cache data for faster navigation
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 30 * 60 * 1000,    // Keep in cache for 30 minutes (formerly cacheTime)
  });

  // Flatten all pages into a single array
  const allTargets = infiniteData?.pages.flatMap(page => page.targets) ?? [];
  const totalCount = infiniteData?.pages[0]?.pagination.total ?? 0;

  // Animate loading dots
  useEffect(() => {
    if (!isLoading) {
      setLoadingDots('.');
      return;
    }

    const interval = setInterval(() => {
      setLoadingDots((prev) => {
        if (prev === '...') return '.';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isLoading]);

  const addMutation = useMutation({
    mutationFn: addToWishlist,
    onSuccess: (_, targetId) => {
      queryClient.invalidateQueries({ queryKey: ['user-targets'] });
      setAddedTargets((prev) => new Set(prev).add(targetId));
    },
  });

  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      Galaxy: 'blue',
      'Emission Nebula': 'red',
      'Planetary Nebula': 'grape',
      'Supernova Remnant': 'orange',
      'Open Cluster': 'cyan',
      'Globular Cluster': 'yellow',
      Nebula: 'pink',
      Star: 'gray',
    };
    return colors[type] || 'gray';
  };

  const handleAddToWishlist = (targetId: string): void => {
    if (!session) {
      router.push('/login');
      return;
    }
    addMutation.mutate(targetId);
  };

  // Format RA in HH:MM:SS format
  const formatRA = (raDeg: number): string => {
    const hours = raDeg / 15;
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    const s = Math.floor(((hours - h) * 60 - m) * 60);
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  // Format Dec in ±DD:MM:SS format
  const formatDec = (decDeg: number): string => {
    const sign = decDeg >= 0 ? '+' : '';
    const absDec = Math.abs(decDeg);
    const d = Math.floor(absDec);
    const m = Math.floor((absDec - d) * 60);
    const s = Math.floor(((absDec - d) * 60 - m) * 60);
    return `${sign}${d.toString().padStart(2, '0')}° ${m.toString().padStart(2, '0')}′ ${s.toString().padStart(2, '0')}″`;
  };

  // Get planet-specific image URL from Wikimedia Commons (stable NASA/JPL images)
  const getPlanetImageUrl = (solarSystemBody: string): string => {
    const planetImages: Record<string, string> = {
      'Mercury': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Mercury_in_color_-_Prockter07-edit1.jpg/300px-Mercury_in_color_-_Prockter07-edit1.jpg',
      'Venus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Venus-real_color.jpg/300px-Venus-real_color.jpg',
      'Mars': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/OSIRIS_Mars_true_color.jpg/300px-OSIRIS_Mars_true_color.jpg',
      'Jupiter': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Jupiter_New_Horizons.jpg/300px-Jupiter_New_Horizons.jpg',
      'Saturn': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Saturn_during_Equinox.jpg/300px-Saturn_during_Equinox.jpg',
      'Uranus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Uranus_as_seen_by_NASA%27s_Voyager_2_%28remastered%29_-_JPEG_converted.jpg/300px-Uranus_as_seen_by_NASA%27s_Voyager_2_%28remastered%29_-_JPEG_converted.jpg',
      'Neptune': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Neptune_-_Voyager_2_%2829347980845%29_flatten_crop.jpg/300px-Neptune_-_Voyager_2_%2829347980845%29_flatten_crop.jpg',
      'Moon': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/FullMoon2010.jpg/300px-FullMoon2010.jpg',
    };
    return planetImages[solarSystemBody] || '';
  };

  // Placeholder comet image (no API available for individual comet images)
  const getCometImageUrl = (): string => {
    // High-quality telescopic image of Comet Hale-Bopp showing dust and ion tails
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Comet_Hale-Bopp_1995O1.jpg/300px-Comet_Hale-Bopp_1995O1.jpg';
  };

  // Generate HiPS2FITS preview image URL for deep-sky objects
  const getDSSImageUrl = (target: Target): string => {
    // Use dynamic coordinates if available, otherwise use static
    const raDeg = target.dynamicRaDeg ?? target.raDeg;
    const decDeg = target.dynamicDecDeg ?? target.decDeg;

    // Use Aladin HiPS2FITS service with DSS2 color survey
    // FOV calculated based on target size or default to 0.5 degrees
    const fovDeg = target.sizeMajorArcmin
      ? Math.max(target.sizeMajorArcmin / 60, 0.2) * 1.5  // 1.5x target size for context
      : 0.5; // Default 0.5 degree FOV

    const params = new URLSearchParams({
      hips: 'CDS/P/DSS2/color',
      ra: raDeg.toString(),
      dec: decDeg.toString(),
      width: '300',
      height: '300',
      fov: fovDeg.toString(),
      format: 'jpg',
    });

    return `https://alasky.u-strasbg.fr/hips-image-services/hips2fits?${params}`;
  };

  // Get appropriate image URL based on target type
  // All external images are proxied through our image cache API
  const getTargetImageUrl = (target: Target): string => {
    // Use stored thumbnail if available (already in MinIO)
    if (target.thumbnailUrl) return target.thumbnailUrl;

    let externalUrl: string;

    // Determine the external URL
    if (target.type === 'Comet') {
      externalUrl = getCometImageUrl();
    } else if (target.solarSystemBody) {
      externalUrl = getPlanetImageUrl(target.solarSystemBody);
    } else {
      externalUrl = getDSSImageUrl(target);
    }

    // Proxy through our image cache API for lazy caching
    return `/api/image-proxy?url=${encodeURIComponent(externalUrl)}`;
  };

  // Get high-quality (larger) image URL for modal view
  const getHighQualityImageUrl = (target: Target): string => {
    let externalUrl: string;

    if (target.type === 'Comet') {
      // For comets, use a larger version from Wikimedia
      externalUrl = 'https://upload.wikimedia.org/wikipedia/commons/4/45/Comet_Hale-Bopp_1995O1.jpg';
    } else if (target.solarSystemBody) {
      // For planets, get larger non-thumbnail versions
      const planetLargeImages: Record<string, string> = {
        'Mercury': 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Mercury_in_color_-_Prockter07-edit1.jpg',
        'Venus': 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Venus-real_color.jpg',
        'Mars': 'https://upload.wikimedia.org/wikipedia/commons/0/02/OSIRIS_Mars_true_color.jpg',
        'Jupiter': 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Jupiter_New_Horizons.jpg',
        'Saturn': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Saturn_during_Equinox.jpg',
        'Uranus': 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Uranus_as_seen_by_NASA%27s_Voyager_2_%28remastered%29_-_JPEG_converted.jpg',
        'Neptune': 'https://upload.wikimedia.org/wikipedia/commons/6/63/Neptune_-_Voyager_2_%2829347980845%29_flatten_crop.jpg',
        'Moon': 'https://upload.wikimedia.org/wikipedia/commons/e/e1/FullMoon2010.jpg',
      };
      externalUrl = planetLargeImages[target.solarSystemBody] || getPlanetImageUrl(target.solarSystemBody);
    } else {
      // For deep-sky objects, generate larger HiPS2FITS image (1024x1024, larger FOV)
      const raDeg = target.dynamicRaDeg ?? target.raDeg;
      const decDeg = target.dynamicDecDeg ?? target.decDeg;
      const fovDeg = target.sizeMajorArcmin
        ? Math.max(target.sizeMajorArcmin / 60, 0.5) * 2  // 2x size for context
        : 1; // Default 1 degree FOV for modal

      const params = new URLSearchParams({
        hips: 'CDS/P/DSS2/color',
        ra: raDeg.toString(),
        dec: decDeg.toString(),
        width: '1024',
        height: '1024',
        fov: fovDeg.toString(),
        format: 'jpg',
      });

      externalUrl = `https://alasky.u-strasbg.fr/hips-image-services/hips2fits?${params}`;
    }

    return `/api/image-proxy?url=${encodeURIComponent(externalUrl)}`;
  };

  // Handle image click to open modal
  const handleImageClick = (target: Target) => {
    setSelectedImageTarget(target);
    setImageLoading(true);
    setImageModalOpen(true);
  };

  if (locationsLoading) {
    return (
      <Container size="xl" py="xl">
        <Text>Loading locations...</Text>
      </Container>
    );
  }

  if (!locations || locations.length === 0) {
    return (
      <Container size="xl" py="xl">
        <Paper p="xl" withBorder>
          <Stack align="center" gap="md">
            <IconMapPin size={48} stroke={1.5} color="gray" />
            <Title order={3}>No Locations Found</Title>
            <Text c="dimmed" ta="center">
              You need to add at least one observing location before viewing targets.
            </Text>
            <Button component="a" href="/dashboard/locations" leftSection={<IconPlus size={16} />}>
              Add Location
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="sm">
        <Group justify="space-between">
          <div>
            <Title order={1}>Target Catalog</Title>
            <Text c="dimmed" size="lg">
              Browse 13,000+ deep sky objects with real-time visibility
            </Text>
          </div>
        </Group>

        {/* Location, Gear, and Date Selectors */}
        <Paper p="md" withBorder>
          <Stack gap="md">
            <Group gap="md" align="flex-start">
              <div>
                <Text size="sm" fw={500} mb={8}>Observing Location</Text>
                <Select
                  placeholder="Select your location"
                  data={
                    locations?.map((loc) => ({
                      value: loc.id,
                      label: `${loc.name}${loc.isFavorite ? ' ⭐' : ''}`,
                    })) || []
                  }
                  value={selectedLocation?.id || ''}
                  onChange={(value) => {
                    const loc = locations?.find((l) => l.id === value);
                    if (loc) setSelectedLocation(loc);
                  }}
                  style={{ minWidth: 250 }}
                />
                {selectedLocation && (
                  <Text size="xs" c="dimmed" mt={4}>
                    {selectedLocation.latitude.toFixed(2)}°, {selectedLocation.longitude.toFixed(2)}°
                  </Text>
                )}
              </div>

              <div>
                <Text size="sm" fw={500} mb={8}>Gear (Optional)</Text>
                <Select
                  placeholder="Select gear for FOV filtering"
                  data={rigs?.map(r => ({
                    value: r.id,
                    label: `${r.name} (${r.fovWidthArcmin.toFixed(1)}' × ${r.fovHeightArcmin.toFixed(1)}')`
                  })) || []}
                  value={selectedGear?.id || null}
                  onChange={(value) => {
                    const rig = rigs?.find(r => r.id === value);
                    setSelectedGear(rig || null);
                  }}
                  clearable
                  style={{ minWidth: 300 }}
                />
                {selectedGear && (
                  <Text size="xs" c="dimmed" mt={4}>
                    FOV: {selectedGear.fovWidthArcmin.toFixed(1)}' × {selectedGear.fovHeightArcmin.toFixed(1)}'
                  </Text>
                )}
              </div>

              <div>
                <Text size="sm" fw={500} mb={8}>Date</Text>
                <DatePickerInput
                  value={selectedDate}
                  onChange={(date) => setSelectedDate(date || new Date())}
                  placeholder="Pick date"
                  style={{ minWidth: 200 }}
                  getDayProps={(date) => {
                    const today = new Date();
                    const isToday =
                      date.getDate() === today.getDate() &&
                      date.getMonth() === today.getMonth() &&
                      date.getFullYear() === today.getFullYear();

                    return {
                      style: isToday ? {
                        backgroundColor: 'var(--mantine-color-blue-6)',
                        color: 'white',
                        fontWeight: 'bold',
                        border: '2px solid var(--mantine-color-blue-4)',
                      } : undefined
                    };
                  }}
                />
              </div>
            </Group>
          </Stack>
        </Paper>

        {/* Search and Basic Filters */}
        <Stack gap="md">
          <Group grow>
            <TextInput
              placeholder="Search by name or catalog ID (M31, NGC224, etc.)"
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
            />
            <Menu closeOnItemClick={false} width={250}>
              <Menu.Target>
                <Button
                  variant="default"
                  rightSection={<IconSelector size={16} style={{ color: 'var(--mantine-color-dark-3)' }} />}
                  fullWidth
                  styles={{
                    root: {
                      height: '36px',
                      fontWeight: 400,
                    },
                    label: {
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    },
                    section: {
                      marginLeft: 0,
                    },
                  }}
                >
                  <Text size="sm" c={types.length === 0 ? 'dimmed' : undefined}>
                    {types.length === 0 ? 'All types' : `${types.length} type${types.length > 1 ? 's' : ''} selected`}
                  </Text>
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>
                  <Group justify="space-between">
                    <Text size="sm">Object Type</Text>
                    {types.length > 0 && (
                      <Button
                        size="xs"
                        variant="subtle"
                        onClick={() => {
                          setTypes([]);
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </Group>
                </Menu.Label>
                {[
                  'Planet',
                  'Natural Satellite',
                  'Comet',
                  'Galaxy',
                  'Emission Nebula',
                  'Planetary Nebula',
                  'Supernova Remnant',
                  'Open Cluster',
                  'Globular Cluster',
                  'Nebula',
                ].map((typeOption) => (
                  <Menu.Item
                    key={typeOption}
                    onClick={() => {
                      if (types.includes(typeOption)) {
                        setTypes(types.filter((t) => t !== typeOption));
                      } else {
                        setTypes([...types, typeOption]);
                      }
                    }}
                  >
                    <Checkbox
                      label={typeOption}
                      checked={types.includes(typeOption)}
                      onChange={() => {}} // Handled by Menu.Item onClick
                      styles={{ input: { cursor: 'pointer' }, label: { cursor: 'pointer' } }}
                    />
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
            <Select
              placeholder="All constellations"
              clearable
              searchable
              data={[
              'Andromeda',
              'Antlia',
              'Apus',
              'Aquarius',
              'Aquila',
              'Ara',
              'Aries',
              'Auriga',
              'Boötes',
              'Caelum',
              'Camelopardalis',
              'Cancer',
              'Canes Venatici',
              'Canis Major',
              'Canis Minor',
              'Capricornus',
              'Carina',
              'Cassiopeia',
              'Centaurus',
              'Cepheus',
              'Cetus',
              'Chamaeleon',
              'Circinus',
              'Columba',
              'Coma Berenices',
              'Corona Australis',
              'Corona Borealis',
              'Corvus',
              'Crater',
              'Crux',
              'Cygnus',
              'Delphinus',
              'Dorado',
              'Draco',
              'Equuleus',
              'Eridanus',
              'Fornax',
              'Gemini',
              'Grus',
              'Hercules',
              'Horologium',
              'Hydra',
              'Hydrus',
              'Indus',
              'Lacerta',
              'Leo',
              'Leo Minor',
              'Lepus',
              'Libra',
              'Lupus',
              'Lynx',
              'Lyra',
              'Mensa',
              'Microscopium',
              'Monoceros',
              'Musca',
              'Norma',
              'Octans',
              'Ophiuchus',
              'Orion',
              'Pavo',
              'Pegasus',
              'Perseus',
              'Phoenix',
              'Pictor',
              'Pisces',
              'Piscis Austrinus',
              'Puppis',
              'Pyxis',
              'Reticulum',
              'Sagitta',
              'Sagittarius',
              'Scorpius',
              'Sculptor',
              'Scutum',
              'Serpens',
              'Sextans',
              'Taurus',
              'Telescopium',
              'Triangulum',
              'Triangulum Australe',
              'Tucana',
              'Ursa Major',
              'Ursa Minor',
              'Vela',
              'Virgo',
              'Volans',
              'Vulpecula',
            ]}
            value={constellation}
            onChange={(val) => {
              setConstellation(val || '');
            }}
          />
        </Group>
      </Stack>

        {/* Sort and Advanced Filters */}
        <Group gap="md" mb={0} align="center">
          <Button
            variant="subtle"
            leftSection={<IconArrowsSort size={16} />}
            rightSection={showSort ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            onClick={() => setShowSort(!showSort)}
          >
            Sort
          </Button>
          <Button
            variant="subtle"
            leftSection={<IconFilter size={16} />}
            rightSection={showFilters ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            onClick={() => setShowFilters(!showFilters)}
            style={{ color: applyAdvancedFilters ? 'var(--mantine-color-green-5)' : undefined }}
          >
            Advanced Filters
          </Button>

          <Checkbox
            label="Apply filters"
            checked={applyAdvancedFilters}
            onChange={(event) => setApplyAdvancedFilters(event.currentTarget.checked)}
            color="green"
          />
        </Group>

        <Collapse in={showSort}>
          <Paper p="md" mt="xs" withBorder>
            <Stack gap="md">
              <Group grow>
                <Select
                  label="Sort by"
                  clearable={false}
                  data={[
                    { value: 'tonights-best', label: "Tonight's best" },
                    { value: 'magnitude', label: 'Magnitude' },
                    { value: 'size', label: 'Size' },
                  ]}
                  value={sortBy}
                  onChange={(val) => {
                    setSortBy((val as 'magnitude' | 'size' | 'tonights-best') || 'magnitude');
                  }}
                />
                <Select
                  label="Direction"
                  clearable={false}
                  disabled={sortBy === 'tonights-best'}
                  data={[
                    {
                      value: 'desc',
                      label: sortBy === 'magnitude' ? '↓ Brightest first' :
                             sortBy === 'size' ? '↓ Largest first' :
                             '↓ Best first'
                    },
                    {
                      value: 'asc',
                      label: sortBy === 'magnitude' ? '↑ Faintest first' :
                             sortBy === 'size' ? '↑ Smallest first' :
                             '↑ Worst first'
                    },
                  ]}
                  value={sortDirection}
                  onChange={(val) => {
                    setSortDirection((val as 'asc' | 'desc') || 'desc');
                  }}
                />
              </Group>
            </Stack>
          </Paper>
        </Collapse>

        <div>
          <Collapse in={showFilters}>
            <Paper p="md" mt="xs" withBorder>
              <Stack gap="md">
                <div style={{ paddingLeft: 16, paddingRight: 16 }}>
                  <Text size="sm" fw={500} mb={8}>
                    Magnitude Range (brightness - lower is brighter)
                  </Text>
                  <RangeSlider
                    min={-15}
                    max={25}
                    step={0.5}
                    value={magnitudeRange}
                    onChange={setMagnitudeRange}
                    marks={[
                      { value: -15, label: '-15 (Moon)' },
                      { value: 0, label: '0' },
                      { value: 15, label: '15' },
                      { value: 25, label: '25 (faint)' },
                    ]}
                  />
                  <Text size="xs" c="dimmed" mt={20}>
                    Brighter objects have lower magnitude values
                  </Text>
                </div>
                {/* Time Window Filter */}
                <div style={{ paddingLeft: 16, paddingRight: 16 }}>
                  <Text size="sm" fw={500} mb={8}>
                    Visibility Time Window
                  </Text>
                  <RangeSlider
                    min={12}
                    max={36}
                    step={0.5}
                    minRange={1}
                    value={timeWindow}
                    onChange={(val) => {
                      setTimeWindow([val[0], val[1]]);
                    }}
                    marks={[
                      { value: 12, label: '12h' },
                      { value: 18, label: '18h' },
                      { value: 24, label: '00h' },
                      { value: 30, label: '06h' },
                      { value: 36, label: '12h' },
                    ]}
                    label={(val) => {
                      const hour = val >= 24 ? val - 24 : val;
                      return `${hour.toString().padStart(2, '0')}:00`;
                    }}
                  />
                  <Text size="xs" c="dimmed" mt={20}>
                    Target must be visible during this time window
                  </Text>
                </div>

                {/* Altitude Range Filter */}
                <div style={{ paddingLeft: 16, paddingRight: 16 }}>
                  <Text size="sm" fw={500} mb={8}>
                    Altitude Range (degrees above horizon)
                  </Text>
                  <RangeSlider
                    min={0}
                    max={90}
                    step={5}
                    value={altitudeRange}
                    onChange={(val) => {
                      setAltitudeRange(val);
                    }}
                    marks={[
                      { value: 0, label: '0°' },
                      { value: 30, label: '30°' },
                      { value: 60, label: '60°' },
                      { value: 90, label: '90°' },
                    ]}
                    label={(val) => `${val}°`}
                  />
                  <Text size="xs" c="dimmed" mt={20}>
                    Filter by minimum and maximum altitude
                  </Text>
                </div>

                <Divider />

                {/* FOV Coverage Filter */}
                <div style={{ paddingLeft: 16, paddingRight: 16 }}>
                  <Group justify="space-between" mb={8}>
                    <Text size="sm" fw={500}>
                      FOV Coverage (requires gear selection)
                    </Text>
                    <Checkbox
                      label="Enable FOV filter"
                      checked={enableFOVFilter}
                      onChange={(e) => setEnableFOVFilter(e.currentTarget.checked)}
                      disabled={!selectedGear}
                      size="xs"
                    />
                  </Group>

                  {selectedGear && (
                    <>
                      <RangeSlider
                        min={1}
                        max={300}
                        step={5}
                        value={fovCoverageRange}
                        onChange={setFovCoverageRange}
                        disabled={!enableFOVFilter || !selectedGear}
                        marks={[
                          { value: 10, label: '10%' },
                          { value: 100, label: '100%' },
                          { value: 200, label: '200%' },
                        ]}
                      />
                      <Text size="xs" c="dimmed" mt={20}>
                        Target should occupy {fovCoverageRange[0]}% to {fovCoverageRange[1]}% of FOV width.
                        Disable for mosaics or wide-field imaging.
                      </Text>
                    </>
                  )}

                  {!selectedGear && (
                    <Text size="xs" c="dimmed" mt={8}>
                      Select gear above to enable FOV-based filtering
                    </Text>
                  )}
                </div>

                <Divider />

                {/* Azimuth Dial Filter */}
                <div style={{ paddingLeft: 16, paddingRight: 16 }}>
                  <Text size="sm" fw={500} mb={8}>
                    Azimuth Direction (exclude obstructed areas)
                  </Text>
                  <Box style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                    <svg width="220" height="220" style={{ cursor: 'pointer' }}>
                      {/* Outer circle */}
                      <circle
                        cx="110"
                        cy="110"
                        r="100"
                        fill="none"
                        stroke="var(--mantine-color-dark-4)"
                        strokeWidth="2"
                      />

                      {/* 24 segments of 15° each */}
                      {azimuthSegments.map((enabled, i) => {
                        const angle = i * 15;
                        const startAngle = (angle - 90) * (Math.PI / 180);
                        const endAngle = ((angle + 15) - 90) * (Math.PI / 180);

                        const x1 = 110 + 84 * Math.cos(startAngle);
                        const y1 = 110 + 84 * Math.sin(startAngle);
                        const x2 = 110 + 84 * Math.cos(endAngle);
                        const y2 = 110 + 84 * Math.sin(endAngle);

                        const largeArc = 0;
                        const d = `M 110 110 L ${x1} ${y1} A 84 84 0 ${largeArc} 1 ${x2} ${y2} Z`;

                        return (
                          <path
                            key={i}
                            d={d}
                            fill={enabled ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-dark-6)'}
                            opacity={enabled ? 0.6 : 0.3}
                            stroke="var(--mantine-color-dark-5)"
                            strokeWidth="0.5"
                            onClick={() => {
                              const newSegments = [...azimuthSegments];
                              newSegments[i] = !newSegments[i];
                              setAzimuthSegments(newSegments);
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                        );
                      })}

                      {/* Degree labels at every 30° */}
                      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
                        const angle = (deg - 90) * (Math.PI / 180);
                        const x = 110 + 92 * Math.cos(angle);
                        const y = 110 + 92 * Math.sin(angle);

                        return (
                          <text
                            key={deg}
                            x={x}
                            y={y + 4}
                            textAnchor="middle"
                            fill="var(--mantine-color-dimmed)"
                            fontSize="9"
                            fontWeight="500"
                          >
                            {deg}°
                          </text>
                        );
                      })}

                      {/* Center dot */}
                      <circle cx="110" cy="110" r="3" fill="var(--mantine-color-blue-4)" />
                    </svg>
                  </Box>
                  <Text size="xs" c="dimmed" mt={8} ta="center">
                    Click 15° segments to exclude obstructed directions (trees, buildings, etc.)
                  </Text>
                </div>
              </Stack>
            </Paper>
          </Collapse>
        </div>

        {/* Target Grid */}
        <div style={{ position: 'relative', minHeight: 400 }}>
          {isLoading && (
            <Paper
              p="xl"
              withBorder
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 100,
                backgroundColor: 'rgba(26, 27, 30, 0.95)'
              }}
            >
              <Center>
                <Stack align="center" gap="xs">
                  <Loader size="md" />
                  <Text size="sm" fw={500}>
                    Processing {totalCount > 0 ? totalCount.toLocaleString() : '...'} targets{loadingDots}
                  </Text>
                  <Text size="xs" c="dimmed">
                    This takes a while
                  </Text>
                </Stack>
              </Center>
            </Paper>
          )}

          {!selectedLocation && (
            <Paper p="xl" withBorder>
              <Stack align="center" gap="md">
                <IconAlertCircle size={48} stroke={1.5} color="orange" />
                <Text c="dimmed" ta="center">
                  Please select a location to view targets
                </Text>
              </Stack>
            </Paper>
          )}

          {allTargets.length > 0 ? (
            <>
              <Text size="sm" c="dimmed" mb="md">
                Showing {allTargets.length} of {totalCount} targets
                {isFetchingNextPage && ' (loading more...)'}
              </Text>

              <List
                style={{ height: '800px', width: '100%' }}
                rowComponent={({ index, style, ...rowProps }: any) => {
                  // Show loading indicator at the end
                  if (index >= allTargets.length) {
                    return (
                      <div style={style}>
                        <Paper p="md" withBorder style={{ backgroundColor: 'var(--mantine-color-dark-7)', margin: '8px 0' }}>
                          <Center>
                            <Loader size="sm" />
                            <Text size="sm" c="dimmed" ml="sm">Loading more targets...</Text>
                          </Center>
                        </Paper>
                      </div>
                    );
                  }

                  const target = allTargets[index];
                  const isAdded = addedTargets.has(target.id);
                  const imageUrl = getTargetImageUrl(target);

                  return (
                    <div style={style}>
                      <Paper key={target.id} p="xs" withBorder style={{ backgroundColor: 'var(--mantine-color-dark-7)', margin: '8px 0' }}>
                      <Group align="flex-start" gap="sm" wrap="nowrap">
                        {/* Preview Image - Click to enlarge */}
                        <Box
                          style={{ minWidth: 150, width: 150, cursor: 'pointer' }}
                          onClick={() => handleImageClick(target)}
                        >
                          <Image
                            src={imageUrl}
                            height={150}
                            width={150}
                            alt={target.name}
                            loading="lazy"
                            fallbackSrc="https://placehold.co/150x150/1a1b1e/white?text=No+Image"
                            radius="sm"
                            style={{ transition: 'transform 0.2s', ':hover': { transform: 'scale(1.05)' } }}
                          />
                        </Box>

                        {/* Target Info */}
                        <Stack gap={4} style={{ flex: 1, minWidth: 200 }}>
                          <div>
                            <Group gap="xs" mb={4}>
                              {target.messierId && (
                                <Badge size="sm" color="yellow" variant="filled">
                                  {target.messierId}
                                </Badge>
                              )}
                              <Text fw={600} size="lg" c="green">
                                {target.name}
                              </Text>
                            </Group>
                            {target.catalogId && (
                              <Text size="sm" c="dimmed">
                                {target.catalogId}
                              </Text>
                            )}
                          </div>

                          <Group gap="xs">
                            <Text size="sm" c="dimmed">
                              <Text span fw={600}>RA</Text> {formatRA(target.dynamicRaDeg ?? target.raDeg)}
                            </Text>
                            <Text size="sm" c="dimmed">
                              <Text span fw={600}>BRT:</Text> {target.type}
                            </Text>
                          </Group>

                          <Group gap="xs">
                            <Text size="sm" c="dimmed">
                              <Text span fw={600}>DEC</Text> {formatDec(target.dynamicDecDeg ?? target.decDeg)}
                            </Text>
                            {target.sizeMajorArcmin && (
                              <Text size="sm" c="dimmed">
                                <Text span fw={600}>Size:</Text> {target.sizeMajorArcmin.toFixed(1)}′
                                {target.sizeMinorArcmin && ` x ${target.sizeMinorArcmin.toFixed(1)}′`}
                              </Text>
                            )}
                          </Group>

                          {target.magnitude && (
                            <Text size="sm" c="dimmed">
                              <Text span fw={600}>Mag:</Text> {target.magnitude.toFixed(1)}
                            </Text>
                          )}

                          <Group gap="xs" mt="xs">
                            <Badge color={getTypeColor(target.type)} variant="light" size="sm">
                              {target.type}
                            </Badge>
                            {target.constellation && (
                              <Badge variant="outline" size="sm">
                                {target.constellation}
                              </Badge>
                            )}
                            {session && (
                              <Tooltip label={isAdded ? 'Added to wishlist' : 'Add to wishlist'}>
                                <ActionIcon
                                  variant="subtle"
                                  color={isAdded ? 'green' : 'blue'}
                                  onClick={() => handleAddToWishlist(target.id)}
                                  loading={addMutation.isPending}
                                  disabled={isAdded}
                                  size="sm"
                                >
                                  {isAdded ? <IconCheck size={14} /> : <IconPlus size={14} />}
                                </ActionIcon>
                              </Tooltip>
                            )}
                          </Group>
                        </Stack>

                        {/* Visibility Chart */}
                        {selectedLocation &&
                          target.currentAltitude !== undefined &&
                          target.currentAzimuth !== undefined && (
                            <VisibilityChart
                              target={target}
                              location={selectedLocation}
                              showMoonOverlay={showMoonOverlay}
                              selectedDate={selectedDate}
                            />
                          )}

                        {/* Direction Compass and Moon Phase */}
                        {selectedLocation && target.currentAzimuth !== undefined && (
                          <Stack gap="xs" align="center">
                            <DirectionCompass azimuth={target.currentAzimuth} />

                            {/* Moon Phase Display */}
                            {currentMoonPhase && showMoonOverlay && (
                              <MoonPhaseDisplay
                                illumination={currentMoonPhase.illumination}
                                hasInterference={currentMoonPhase.illumination > 0.3}
                              />
                            )}
                          </Stack>
                        )}
                      </Group>
                    </Paper>
                    </div>
                  );
                }}
                rowCount={allTargets.length + (hasNextPage ? 1 : 0)}
                rowHeight={220}
                rowProps={{}}
                onRowsRendered={({ stopIndex }: any) => {
                  // Load next page when user scrolls near the bottom
                  if (
                    !isFetchingNextPage &&
                    hasNextPage &&
                    stopIndex >= allTargets.length - 3
                  ) {
                    fetchNextPage();
                  }
                }}
              />
            </>
          ) : (
            !isLoading &&
            selectedLocation && (
              <Paper p="xl" withBorder>
                <Text c="dimmed" ta="center" py="xl">
                  No targets found. Try adjusting your filters.
                </Text>
              </Paper>
            )
          )}
        </div>
      </Stack>

      {/* Image Modal */}
      <Modal
        opened={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        title={selectedImageTarget?.name || 'Target Image'}
        size="xl"
        centered
      >
        {selectedImageTarget && (
          <Stack gap="md">
            <Box pos="relative">
              {imageLoading && (
                <Center
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    borderRadius: '8px',
                  }}
                >
                  <Stack align="center" gap="sm">
                    <Loader size="lg" />
                    <Text size="sm" c="dimmed">
                      Loading high-quality image...
                    </Text>
                  </Stack>
                </Center>
              )}
              <Image
                src={getHighQualityImageUrl(selectedImageTarget)}
                alt={selectedImageTarget.name}
                onLoad={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
                fallbackSrc="https://placehold.co/1024x1024/1a1b1e/white?text=Loading..."
                radius="md"
                fit="contain"
                style={{ maxHeight: '70vh' }}
              />
            </Box>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="lg" fw={600}>{selectedImageTarget.name}</Text>
                <Badge color={getTypeColor(selectedImageTarget.type)}>
                  {selectedImageTarget.type}
                </Badge>
              </Group>
              {selectedImageTarget.constellation && (
                <Text size="sm" c="dimmed">
                  Constellation: {selectedImageTarget.constellation}
                </Text>
              )}
              {selectedImageTarget.magnitude !== null && (
                <Text size="sm" c="dimmed">
                  Magnitude: {selectedImageTarget.magnitude.toFixed(1)}
                </Text>
              )}
              {selectedImageTarget.sizeMajorArcmin && (
                <Text size="sm" c="dimmed">
                  Size: {selectedImageTarget.sizeMajorArcmin.toFixed(1)}′ × {selectedImageTarget.sizeMinorArcmin?.toFixed(1) || '?'}′
                </Text>
              )}
            </Stack>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
