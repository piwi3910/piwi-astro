'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useDebouncedValue } from '@/hooks';
import {
  Container,
  Title,
  TextInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stack,
  Group,
  Text,
  Badge,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Card,
  Slider,
  Box,
  Separator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Loader,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  DatePicker,
} from '@/components/ui';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Virtuoso } from 'react-virtuoso';
import { useSession } from 'next-auth/react';
import {
  IconSearch,
  IconPlus,
  IconChevronDown,
  IconChevronUp,
  IconFilter,
  IconMapPin,
  IconAlertCircle,
  IconArrowsSort,
  IconSelector,
  IconHistory,
  IconHeart,
  IconHeartFilled,
  IconCalendarSearch,
  IconArrowUp,
  IconX,
} from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  calculateAltitudeOverTime,
  getDirectionFromAzimuth,
  calculateMoonAltitudeOverTime,
  checkMoonInterference,
  getSafeMoonSeparation,
  calculateSunAltitudeOverTime,
  calculatePlanetPosition,
  calculateBestObservationDate,
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

interface UserTargetResponse {
  id: string;
  targetId: string;
  status: string;
}

async function fetchUserTargets(): Promise<UserTargetResponse[]> {
  const response = await fetch('/api/user-targets');
  if (!response.ok) return [];
  return response.json();
}

async function addToWishlist(targetId: string): Promise<UserTargetResponse> {
  const response = await fetch('/api/user-targets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetId, status: 'WISHLIST' }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add target');
  }
  return response.json();
}

async function removeFromWishlist(userTargetId: string): Promise<void> {
  const response = await fetch(`/api/user-targets/${userTargetId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to remove target from wishlist');
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
  const chartHeight = 100;
  const chartWidth = 400; // Wider chart for card layout
  const maxAltScale = 110; // Extend scale to 110° to give more headroom above 90°

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
    <Box className="relative" style={{ width: chartWidth, height: chartHeight + 30 }}>
      <Text className="text-[10px] font-semibold mb-0.5">
        Alt/°
      </Text>
      <svg
        width={chartWidth}
        height={chartHeight}
        className="block rounded cursor-crosshair"
        style={{ backgroundColor: 'hsl(var(--card))' }}
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
            // Daytime - sky blue overlay
            color = '#38bdf8'; // Sky blue
            opacity = 0.3;
          } else if (sunAlt > -6) {
            // Civil twilight - lighter blue transitioning to darker
            color = '#0ea5e9';
            opacity = 0.2;
          } else if (sunAlt > -12) {
            // Nautical twilight - deeper blue
            color = '#0284c7';
            opacity = 0.15;
          } else if (sunAlt > -18) {
            // Astronomical twilight - dark blue (marginal for astrophotography)
            color = '#0369a1';
            opacity = 0.1;
          } else {
            // Astronomical night (below -18°) - off black/dark navy, perfect for astrophotography
            color = '#0c1929';
            opacity = 0.5;
          }

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
              stroke="hsl(var(--muted))"
              strokeWidth="1"
              opacity="0.3"
            />
            <text
              x="5"
              y={chartHeight - (alt / maxAltScale) * chartHeight - 3}
              fill="white"
              fontSize="10"
            >
              {alt}
            </text>
          </g>
        ))}

        {/* Time grid lines (vertical) - every half hour, centered on midnight */}
        {/* Note: Skip hour 24 since it maps to same position as hour 0 (both at center/midnight) */}
        {Array.from({ length: 48 }, (_, i) => i * 0.5).map((hour) => (
          <line
            key={`hour-${hour}`}
            x1={getShiftedPosition(hour) * chartWidth}
            y1={0}
            x2={getShiftedPosition(hour) * chartWidth}
            y2={chartHeight}
            stroke="#6b7280"
            strokeWidth="1"
            opacity="0.5"
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
                fill="hsl(var(--warning))"
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
                stroke="#3b82f6"
                strokeWidth="2"
              />
              <polyline
                points={secondSegment}
                fill="none"
                stroke="#3b82f6"
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
                    strokeWidth="1.5"
                    strokeDasharray="6,4"
                    opacity="0.8"
                  />
                  <polyline
                    points={secondSegment}
                    fill="none"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeDasharray="6,4"
                    opacity="0.8"
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
          stroke="hsl(var(--destructive))"
          strokeWidth="2"
        />

        {/* Current time marker - red line (only show if viewing today) */}
        {isToday && (
          <line
            x1={currentTimePosition * chartWidth}
            y1="0"
            x2={currentTimePosition * chartWidth}
            y2={chartHeight}
            stroke="#ef4444"
            strokeWidth="2"
          />
        )}

        {/* Meridian crossing (transit) - white line from horizon to target curve */}
        {maxAltPoint && maxAlt > 0 && (
          <>
            <line
              x1={getShiftedPosition((points.indexOf(maxAltPoint) / (points.length - 1)) * 24) * chartWidth}
              y1={chartHeight}
              x2={getShiftedPosition((points.indexOf(maxAltPoint) / (points.length - 1)) * 24) * chartWidth}
              y2={chartHeight - (Math.max(0, maxAlt) / maxAltScale) * chartHeight}
              stroke="white"
              strokeWidth="2"
            />
            <circle
              cx={getShiftedPosition((points.indexOf(maxAltPoint) / (points.length - 1)) * 24) * chartWidth}
              cy={chartHeight - (Math.max(0, maxAlt) / maxAltScale) * chartHeight}
              r="3"
              fill="white"
            />
            <text
              x={getShiftedPosition((points.indexOf(maxAltPoint) / (points.length - 1)) * 24) * chartWidth}
              y={chartHeight - (Math.max(0, maxAlt) / maxAltScale) * chartHeight - 8}
              fill="white"
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
            {/* Vertical line following mouse - orange */}
            <line
              x1={hoverX}
              y1="0"
              x2={hoverX}
              y2={chartHeight}
              stroke="#f97316"
              strokeWidth="1"
              strokeDasharray="2,2"
              opacity="0.8"
            />

            {/* Hover point on curve */}
            <circle
              cx={hoverX}
              cy={chartHeight - (Math.max(0, hoverInfo.altitude) / maxAltScale) * chartHeight}
              r="4"
              fill="#f97316"
              stroke="white"
              strokeWidth="1"
            />

            {/* Tooltip background */}
            <rect
              x={hoverX > chartWidth / 2 ? hoverX - 110 : hoverX + 10}
              y={20}
              width={100}
              height={hoverInfo.moonInterference ? 58 : 40}
              fill="hsl(var(--card))"
              stroke="#f97316"
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
              fill="#f97316"
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
                fill="hsl(var(--warning))"
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
      <Box className="relative mt-0.5" style={{ width: chartWidth, height: 20 }}>
        <Group className="justify-between" style={{ width: chartWidth }}>
          {[12, 18, 0, 6, 12].map((hour, idx) => (
            <Text key={`${hour}-${idx}`} className="text-[10px] text-muted-foreground">
              {hour.toString().padStart(2, '0')}h
            </Text>
          ))}
        </Group>
      </Box>
    </Box>
  );
}

function MoonPhaseDisplay({ illumination, hasInterference }: { illumination: number; hasInterference?: boolean }) {
  const size = 40;
  const center = size / 2;
  const radius = size / 2 - 2;

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
    <Stack className="gap-2 items-center">
      <svg width={size} height={size}>
        {/* Background circle (always dark) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="hsl(var(--card))"
          stroke="hsl(var(--border))"
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
              fill="hsl(var(--warning))"
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

      <Stack className="gap-0 items-center">
        <Text className="text-[10px] font-medium">
          {getMoonPhase(illumination)}
        </Text>
        <Text className="text-[9px] text-muted-foreground">
          {(illumination * 100).toFixed(0)}%
        </Text>
        {hasInterference && (
          <Badge className="text-[9px] py-0 px-1" variant="outline">
            ⚠️
          </Badge>
        )}
      </Stack>
    </Stack>
  );
}

function DirectionCompass({ azimuth }: { azimuth: number }) {
  const size = 50;
  const center = size / 2;
  const radius = size / 2 - 6;

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
          stroke="hsl(var(--border))"
          strokeWidth="2"
        />

        {/* Cardinal directions */}
        <text x={center} y={8} fill="hsl(var(--muted-foreground))" fontSize="9" textAnchor="middle" fontWeight="bold">N</text>
        <text x={size - 4} y={center + 3} fill="hsl(var(--muted-foreground))" fontSize="8" textAnchor="middle">E</text>
        <text x={center} y={size - 2} fill="hsl(var(--muted-foreground))" fontSize="8" textAnchor="middle">S</text>
        <text x={4} y={center + 3} fill="hsl(var(--muted-foreground))" fontSize="8" textAnchor="middle">W</text>

        {/* Direction arrow */}
        <line
          x1={center}
          y1={center}
          x2={arrowX}
          y2={arrowY}
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          markerEnd="url(#arrowhead)"
        />

        <defs>
          <marker
            id="arrowhead"
            markerWidth="6"
            markerHeight="6"
            refX="3"
            refY="2"
            orient="auto"
          >
            <polygon points="0 0, 6 2, 0 4" fill="hsl(var(--primary))" />
          </marker>
        </defs>
      </svg>
      <Text className="text-[10px] text-center text-muted-foreground">
        {azimuth.toFixed(0)}° {getDirectionFromAzimuth(azimuth)}
      </Text>
    </Box>
  );
}

export default function TargetsPage() {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedGear, setSelectedGear] = useState<Rig | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300); // 300ms debounce for search query
  const [debouncedSearchForHistory] = useDebouncedValue(search, 1500); // 1500ms debounce for saving to history
  const [types, setTypes] = useState<string[]>([]);
  const [constellation, setConstellation] = useState('');
  const [magnitudeRange, setMagnitudeRange] = useState<[number, number]>([-15, 25]); // Cover full range: -12.7 to 21.01
  const [timeWindow, setTimeWindow] = useState<[number, number]>([12, 36]); // 12h to 36h (full 24h range)
  const [altitudeRange, setAltitudeRange] = useState<[number, number]>([0, 90]);
  const [azimuthSegments, setAzimuthSegments] = useState<boolean[]>(Array(24).fill(true)); // 24 segments of 15° each
  const [enableFOVFilter, setEnableFOVFilter] = useState(true);
  const [fovCoverageRange, setFovCoverageRange] = useState<[number, number]>([10, 200]);
  const [showFilters, setShowFilters] = useState(false);
  const [applyAdvancedFilters, setApplyAdvancedFilters] = useState(false); // Toggle for advanced visibility filtering
  const showMoonOverlay = true; // Always show moon overlay
  const [sortBy, setSortBy] = useState<'magnitude' | 'size' | 'tonights-best'>('tonights-best');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  // Map of targetId -> userTargetId for tracking wishlist items
  const [addedTargets, setAddedTargets] = useState<Map<string, string>>(new Map());
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImageTarget, setSelectedImageTarget] = useState<Target | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [loadingDots, setLoadingDots] = useState('.');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [searchHistoryOpen, setSearchHistoryOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: session, status } = useSession();
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Read URL params on mount (for navigation from wishlist page)
  useEffect(() => {
    const dateParam = urlSearchParams.get('date');
    const searchParam = urlSearchParams.get('search');

    if (dateParam) {
      const parsedDate = new Date(dateParam);
      if (!isNaN(parsedDate.getTime())) {
        setSelectedDate(parsedDate);
      }
    }

    if (searchParam) {
      setSearch(searchParam);
    }

    // Clear URL params after reading them to avoid confusion on refresh
    if (dateParam || searchParam) {
      router.replace('/targets', { scroll: false });
    }
  }, []); // Only run once on mount

  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
  });

  const { data: rigs } = useQuery({
    queryKey: ['rigs'],
    queryFn: fetchRigs,
  });

  // Fetch user's wishlist targets to populate addedTargets map
  const { data: userTargets } = useQuery({
    queryKey: ['user-targets'],
    queryFn: fetchUserTargets,
    enabled: !!session?.user,
  });

  // Populate addedTargets map when userTargets data changes
  useEffect(() => {
    if (userTargets) {
      const newMap = new Map<string, string>();
      for (const ut of userTargets) {
        newMap.set(ut.targetId, ut.id);
      }
      setAddedTargets(newMap);
    }
  }, [userTargets]);

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

  // Fetch search history on mount (authenticated users only)
  useEffect(() => {
    if (!session?.user) return;

    const fetchSearchHistory = async () => {
      try {
        const response = await fetch('/api/search-history?type=targets');
        if (response.ok) {
          const history = await response.json();
          setSearchHistory(history);
        }
      } catch (error) {
        console.error('Error fetching search history:', error);
      }
    };

    fetchSearchHistory();
  }, [session?.user]);

  // Save search term to history when debounced search changes (authenticated users only)
  // Uses longer 1500ms debounce to only save intentional searches
  useEffect(() => {
    if (!session?.user || !debouncedSearchForHistory || debouncedSearchForHistory.length < 2) return;

    const saveSearchTerm = async () => {
      try {
        const response = await fetch('/api/search-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ term: debouncedSearchForHistory, type: 'targets' }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.history) {
            setSearchHistory(data.history);
          }
        }
      } catch (error) {
        console.error('Error saving search history:', error);
      }
    };

    saveSearchTerm();
  }, [debouncedSearchForHistory, session?.user]);

  // Track scroll position to show/hide scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
    onSuccess: (data, targetId) => {
      queryClient.invalidateQueries({ queryKey: ['user-targets'] });
      setAddedTargets((prev) => new Map(prev).set(targetId, data.id));
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeFromWishlist,
    onSuccess: (_, userTargetId) => {
      queryClient.invalidateQueries({ queryKey: ['user-targets'] });
      setAddedTargets((prev) => {
        const newMap = new Map(prev);
        // Find and delete by userTargetId value
        for (const [targetId, utId] of newMap) {
          if (utId === userTargetId) {
            newMap.delete(targetId);
            break;
          }
        }
        return newMap;
      });
    },
  });

  // Create session with target, location, gear, and date
  const createSessionMutation = useMutation({
    mutationFn: async (params: { targetId: string; targetName: string }) => {
      if (!selectedLocation || !selectedGear) {
        throw new Error('Location and gear must be selected');
      }

      // First create the session
      const sessionResponse = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${params.targetName} Session`,
          locationName: selectedLocation.name,
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          date: selectedDate.toISOString(),
        }),
      });

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json();
        console.error('Session creation error:', errorData);
        throw new Error('Failed to create session');
      }

      const createdSession = await sessionResponse.json();

      // Then add the target to the session
      const targetResponse = await fetch('/api/session-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: createdSession.id,
          targetId: params.targetId,
          rigId: selectedGear.id,
          priority: 1,
        }),
      });

      if (!targetResponse.ok) {
        const errorData = await targetResponse.json();
        console.error('Session target creation error:', errorData);
        throw new Error('Failed to add target to session');
      }

      return createdSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      router.push('/dashboard/sessions');
    },
  });

  const handleCreateSession = (targetId: string, targetName: string): void => {
    if (!session) {
      router.push('/login');
      return;
    }
    if (!selectedLocation) {
      alert('Please select a location first');
      return;
    }
    if (!selectedGear) {
      alert('Please select gear first');
      return;
    }
    createSessionMutation.mutate({ targetId, targetName });
  };

  const handleToggleWishlist = (targetId: string): void => {
    if (!session) {
      router.push('/login');
      return;
    }
    const userTargetId = addedTargets.get(targetId);
    if (userTargetId) {
      // Already in wishlist, remove it
      removeMutation.mutate(userTargetId);
    } else {
      // Not in wishlist, add it
      addMutation.mutate(targetId);
    }
  };

  const handleFindBestDate = (target: Target): void => {
    // Don't calculate for dynamic objects (planets, comets, moon)
    if (target.isDynamic) {
      return;
    }

    // Pass location for visibility check (if target is still well-visible today)
    const locationForCalc = selectedLocation
      ? { latitude: selectedLocation.latitude, longitude: selectedLocation.longitude }
      : undefined;

    const bestDate = calculateBestObservationDate(
      { raDeg: target.raDeg, decDeg: target.decDeg },
      new Date(),
      locationForCalc
    );

    // Set the search filter to the target's catalog ID or name to keep it visible
    const searchTerm = target.catalogId || target.name;
    setSearch(searchTerm);

    // Update the selected date to the best observation date
    setSelectedDate(bestDate);
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
    // FOV calculated based on target size so object fills ~50-70% of the image
    // Small objects need smaller FOV (more zoom), large objects need larger FOV
    let fovDeg: number;
    if (target.sizeMajorArcmin) {
      // Convert arcmin to degrees and multiply by 1.5 for context around the object
      const targetFov = (target.sizeMajorArcmin / 60) * 1.5;
      // Clamp to reasonable bounds:
      // - Min: 0.05 degrees (3 arcmin) - DSS resolution limit
      // - Max: 3 degrees - for very large objects like Andromeda
      fovDeg = Math.min(Math.max(targetFov, 0.05), 3);
    } else {
      // Default 0.5 degree FOV (30 arcmin) when no size info available
      fovDeg = 0.5;
    }

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
      // For deep-sky objects, generate larger HiPS2FITS image (1024x1024)
      const raDeg = target.dynamicRaDeg ?? target.raDeg;
      const decDeg = target.dynamicDecDeg ?? target.decDeg;

      // Scale FOV based on target size so object fills ~50-70% of the image
      // Use 2x multiplier for modal view (more context than thumbnail)
      let fovDeg: number;
      if (target.sizeMajorArcmin) {
        // Convert arcmin to degrees and multiply by 2 for more context in modal
        const targetFov = (target.sizeMajorArcmin / 60) * 2;
        // Clamp to reasonable bounds:
        // - Min: 0.08 degrees (5 arcmin) - DSS resolution limit for high-res
        // - Max: 5 degrees - for very large objects
        fovDeg = Math.min(Math.max(targetFov, 0.08), 5);
      } else {
        // Default 1 degree FOV when no size info available
        fovDeg = 1;
      }

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

  // Delete a search history item
  const deleteSearchHistoryItem = async (term: string) => {
    if (!session?.user) return;

    try {
      const response = await fetch(
        `/api/search-history?term=${encodeURIComponent(term)}&type=targets`,
        { method: 'DELETE' }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.history) {
          setSearchHistory(data.history);
        }
      }
    } catch (error) {
      console.error('Error deleting search history item:', error);
    }
  };

  // Handle search history item click
  const handleSearchHistoryClick = (term: string) => {
    setSearch(term);
    setSearchHistoryOpen(false);
  };

  // Handle image click to open modal
  const handleImageClick = (target: Target) => {
    setSelectedImageTarget(target);
    setImageLoading(true);
    setImageModalOpen(true);
  };

  if (locationsLoading) {
    return (
      <Container className="py-8">
        <Text>Loading locations...</Text>
      </Container>
    );
  }

  if (!locations || locations.length === 0) {
    return (
      <Container className="py-8">
        <Card className="p-8">
          <Stack className="items-center gap-4">
            <IconMapPin size={48} stroke={1.5} className="text-muted-foreground" />
            <Title className="text-xl">No Locations Found</Title>
            <Text className="text-muted-foreground text-center">
              You need to add at least one observing location before viewing targets.
            </Text>
            <Button asChild>
              <a href="/dashboard/locations">
                <IconPlus className="mr-2 h-4 w-4" />
                Add Location
              </a>
            </Button>
          </Stack>
        </Card>
      </Container>
    );
  }

  // Show loading while checking auth status
  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <Container className="py-8">
        <div className="flex items-center justify-center" style={{ height: '50vh' }}>
          <Stack className="items-center gap-4">
            <Loader size="lg" />
            <Text className="text-muted-foreground">Loading...</Text>
          </Stack>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <Stack className="gap-4">
        <Group className="justify-between">
          <div>
            <Title className="text-4xl">Target Catalog</Title>
            <Text className="text-lg text-muted-foreground">
              Browse 13,000+ deep sky objects with real-time visibility
            </Text>
          </div>
        </Group>

        {/* Location, Gear, and Date Selectors */}
        <Card className="p-4">
          <Stack className="gap-4">
            <Group className="gap-4 items-start">
              <div>
                <Text className="text-sm font-medium mb-2">Observing Location</Text>
                <Select
                  value={selectedLocation?.id || ''}
                  onValueChange={(value) => {
                    const loc = locations?.find((l) => l.id === value);
                    if (loc) setSelectedLocation(loc);
                  }}
                >
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Select your location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}{loc.isFavorite ? ' ⭐' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedLocation && (
                  <Text className="text-xs text-muted-foreground mt-1">
                    {selectedLocation.latitude.toFixed(2)}°, {selectedLocation.longitude.toFixed(2)}°
                  </Text>
                )}
              </div>

              <div>
                <Text className="text-sm font-medium mb-2">Gear (Optional)</Text>
                <Select
                  value={selectedGear?.id || ''}
                  onValueChange={(value) => {
                    if (!value) {
                      setSelectedGear(null);
                      return;
                    }
                    const rig = rigs?.find(r => r.id === value);
                    setSelectedGear(rig || null);
                  }}
                >
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Select gear for FOV filtering" />
                  </SelectTrigger>
                  <SelectContent>
                    {rigs?.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} ({r.fovWidthArcmin.toFixed(1)}' × {r.fovHeightArcmin.toFixed(1)}')
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedGear && (
                  <Text className="text-xs text-muted-foreground mt-1">
                    FOV: {selectedGear.fovWidthArcmin.toFixed(1)}' × {selectedGear.fovHeightArcmin.toFixed(1)}'
                  </Text>
                )}
              </div>

              <div>
                <Text className="text-sm font-medium mb-2">Date</Text>
                <DatePicker
                  value={selectedDate}
                  onChange={(date) => setSelectedDate(date || new Date())}
                />
              </div>
            </Group>
          </Stack>
        </Card>

        {/* Search and Basic Filters */}
        <Card className="p-4 relative">
          <Stack className="gap-4">
            <Group className="gap-4 flex-grow">
              <Popover open={searchHistoryOpen && searchHistory.length > 0 && session?.user !== undefined} onOpenChange={setSearchHistoryOpen}>
                <PopoverTrigger asChild>
                  <div className="relative flex-1">
                    <TextInput
                      ref={searchInputRef}
                      placeholder="Search by name or catalog ID (M31, NGC224, etc.)"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onFocus={() => {
                        if (searchHistory.length > 0) {
                          setSearchHistoryOpen(true);
                        }
                      }}
                      leftSection={<IconSearch className="h-4 w-4" />}
                      className="pr-20"
                    />
                    {searchHistory.length > 0 && session?.user && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute inset-y-0 right-0 h-full top-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSearchHistoryOpen(!searchHistoryOpen);
                        }}
                      >
                        <IconHistory className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </PopoverTrigger>
              <PopoverContent className="p-2" align="start">
                <Stack className="gap-1">
                  <Text className="text-xs text-muted-foreground font-medium mb-1">
                    Recent searches
                  </Text>
                  {searchHistory.map((term, _index) => (
                    <Group key={_index} className="justify-between gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 justify-start font-normal"
                        onClick={() => handleSearchHistoryClick(term)}
                      >
                        <IconHistory className="mr-2 h-3.5 w-3.5" />
                        {term}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSearchHistoryItem(term);
                        }}
                      >
                        <IconX className="h-3 w-3" />
                      </Button>
                    </Group>
                  ))}
                </Stack>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-w-[200px] justify-between">
                  <Text className={`text-sm ${types.length === 0 ? 'text-muted-foreground' : ''}`}>
                    {types.length === 0 ? 'All types' : `${types.length} type${types.length > 1 ? 's' : ''} selected`}
                  </Text>
                  <IconSelector className="ml-2 h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[250px]">
                <DropdownMenuLabel>
                  <Group className="justify-between">
                    <Text className="text-sm">Object Type</Text>
                    {types.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setTypes([])}
                      >
                        Clear
                      </Button>
                    )}
                  </Group>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
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
                  <DropdownMenuItem
                    key={typeOption}
                    onClick={() => {
                      if (types.includes(typeOption)) {
                        setTypes(types.filter((t) => t !== typeOption));
                      } else {
                        setTypes([...types, typeOption]);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <Checkbox
                      checked={types.includes(typeOption)}
                      onCheckedChange={() => {}}
                      className="mr-2"
                    />
                    {typeOption}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Select
              value={constellation}
              onValueChange={(val) => setConstellation(val || '')}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All constellations" />
              </SelectTrigger>
              <SelectContent>
                {[
                  'Andromeda', 'Antlia', 'Apus', 'Aquarius', 'Aquila', 'Ara', 'Aries', 'Auriga',
                  'Boötes', 'Caelum', 'Camelopardalis', 'Cancer', 'Canes Venatici', 'Canis Major',
                  'Canis Minor', 'Capricornus', 'Carina', 'Cassiopeia', 'Centaurus', 'Cepheus',
                  'Cetus', 'Chamaeleon', 'Circinus', 'Columba', 'Coma Berenices', 'Corona Australis',
                  'Corona Borealis', 'Corvus', 'Crater', 'Crux', 'Cygnus', 'Delphinus', 'Dorado',
                  'Draco', 'Equuleus', 'Eridanus', 'Fornax', 'Gemini', 'Grus', 'Hercules',
                  'Horologium', 'Hydra', 'Hydrus', 'Indus', 'Lacerta', 'Leo', 'Leo Minor', 'Lepus',
                  'Libra', 'Lupus', 'Lynx', 'Lyra', 'Mensa', 'Microscopium', 'Monoceros', 'Musca',
                  'Norma', 'Octans', 'Ophiuchus', 'Orion', 'Pavo', 'Pegasus', 'Perseus', 'Phoenix',
                  'Pictor', 'Pisces', 'Piscis Austrinus', 'Puppis', 'Pyxis', 'Reticulum', 'Sagitta',
                  'Sagittarius', 'Scorpius', 'Sculptor', 'Scutum', 'Serpens', 'Sextans', 'Taurus',
                  'Telescopium', 'Triangulum', 'Triangulum Australe', 'Tucana', 'Ursa Major',
                  'Ursa Minor', 'Vela', 'Virgo', 'Volans', 'Vulpecula',
                ].map((const_name) => (
                  <SelectItem key={const_name} value={const_name}>
                    {const_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </Group>

            {/* Advanced Filters, Apply checkbox, and Sort options - same row */}
            <Group className="gap-4 items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => setShowFilters(!showFilters)}
                  className={applyAdvancedFilters ? 'text-green-500' : ''}
                >
                  <IconFilter className="mr-2 h-4 w-4" />
                  Advanced Filters
                  {showFilters ? <IconChevronUp className="ml-2 h-4 w-4" /> : <IconChevronDown className="ml-2 h-4 w-4" />}
                </Button>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="apply-filters"
                    checked={applyAdvancedFilters}
                    onCheckedChange={(checked) => setApplyAdvancedFilters(checked as boolean)}
                  />
                  <label htmlFor="apply-filters" className="text-sm cursor-pointer">
                    Apply filters
                  </label>
                </div>
              </div>

              {/* Sort options - aligned right */}
              <div className="flex items-center gap-2">
                <IconArrowsSort className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={sortBy}
                  onValueChange={(val) => setSortBy((val as 'magnitude' | 'size' | 'tonights-best') || 'magnitude')}
                >
                  <SelectTrigger className="w-[150px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tonights-best">Tonight&apos;s best</SelectItem>
                    <SelectItem value="magnitude">Magnitude</SelectItem>
                    <SelectItem value="size">Size</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={sortDirection}
                  onValueChange={(val) => setSortDirection((val as 'asc' | 'desc') || 'desc')}
                  disabled={sortBy === 'tonights-best'}
                >
                  <SelectTrigger className="w-[130px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">
                      {sortBy === 'magnitude' ? '↓ Brightest' :
                        sortBy === 'size' ? '↓ Largest' :
                          '↓ Best'}
                    </SelectItem>
                    <SelectItem value="asc">
                      {sortBy === 'magnitude' ? '↑ Faintest' :
                        sortBy === 'size' ? '↑ Smallest' :
                          '↑ Worst'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Group>

            {/* Advanced Filters Panel - Overlay */}
            {showFilters && (
              <Card className="p-4 absolute left-0 right-0 top-full mt-2 z-50 shadow-lg border max-h-[70vh] overflow-y-auto">
                <Stack className="gap-4">
                  {/* Time Window and FOV Coverage - Side by Side */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* Time Window Filter */}
                    <div>
                      <Text className="text-sm font-medium mb-2">
                        Visibility Time Window
                      </Text>
                      <Slider
                        min={12}
                        max={36}
                        step={0.5}
                        value={timeWindow}
                        onValueChange={(val) => setTimeWindow(val as [number, number])}
                      />
                      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>12h</span>
                        <span>18h</span>
                        <span>00h</span>
                        <span>06h</span>
                        <span>12h</span>
                      </div>
                      <Text className="text-xs text-muted-foreground mt-2">
                        Target must be visible during this time window
                      </Text>
                    </div>

                    {/* FOV Coverage Filter */}
                    <div>
                      <Group className="justify-between mb-2">
                        <Text className="text-sm font-medium">
                          FOV Coverage
                        </Text>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="enable-fov"
                            checked={enableFOVFilter}
                            onCheckedChange={(checked) => setEnableFOVFilter(checked as boolean)}
                            disabled={!selectedGear}
                          />
                          <label htmlFor="enable-fov" className="text-xs cursor-pointer">
                            Enable
                          </label>
                        </div>
                      </Group>

                      {selectedGear && (
                        <>
                          <Slider
                            min={1}
                            max={300}
                            step={5}
                            value={fovCoverageRange}
                            onValueChange={(val) => setFovCoverageRange(val as [number, number])}
                            disabled={!enableFOVFilter || !selectedGear}
                          />
                          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                            <span>10%</span>
                            <span>100%</span>
                            <span>200%</span>
                          </div>
                          <Text className="text-xs text-muted-foreground mt-2">
                            Target should occupy {fovCoverageRange[0]}% to {fovCoverageRange[1]}% of FOV width.
                          </Text>
                        </>
                      )}

                      {!selectedGear && (
                        <Text className="text-xs text-muted-foreground mt-2">
                          Select gear above to enable FOV-based filtering
                        </Text>
                      )}
                    </div>
                  </div>

                  {/* Magnitude and Altitude - Side by Side */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* Magnitude Range Filter */}
                    <div>
                      <Text className="text-sm font-medium mb-2">
                        Magnitude Range
                      </Text>
                      <Slider
                        min={-15}
                        max={25}
                        step={0.5}
                        value={magnitudeRange}
                        onValueChange={(val) => setMagnitudeRange(val as [number, number])}
                      />
                      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>-15</span>
                        <span>0</span>
                        <span>15</span>
                        <span>25</span>
                      </div>
                      <Text className="text-xs text-muted-foreground mt-2">
                        Lower = brighter
                      </Text>
                    </div>

                    {/* Altitude Range Filter */}
                    <div>
                      <Text className="text-sm font-medium mb-2">
                        Altitude Range
                      </Text>
                      <Slider
                        min={0}
                        max={90}
                        step={5}
                        value={altitudeRange}
                        onValueChange={(val) => setAltitudeRange(val as [number, number])}
                      />
                      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>0°</span>
                        <span>30°</span>
                        <span>60°</span>
                        <span>90°</span>
                      </div>
                      <Text className="text-xs text-muted-foreground mt-2">
                        Degrees above horizon
                      </Text>
                    </div>
                  </div>

                  <Separator />

                  {/* Azimuth Dial Filter */}
                    <div>
                      <Text className="text-sm font-medium mb-2">
                        Azimuth Direction
                      </Text>
                      <Box className="flex justify-center">
                        <svg width="200" height="200" className="cursor-pointer">
                          {/* 24 segments of 15° each */}
                          {azimuthSegments.map((enabled, i) => {
                            const angle = i * 15;
                            const startAngle = (angle - 90) * (Math.PI / 180);
                            const endAngle = ((angle + 15) - 90) * (Math.PI / 180);

                            const x1 = 100 + 70 * Math.cos(startAngle);
                            const y1 = 100 + 70 * Math.sin(startAngle);
                            const x2 = 100 + 70 * Math.cos(endAngle);
                            const y2 = 100 + 70 * Math.sin(endAngle);

                            const largeArc = 0;
                            const d = `M 100 100 L ${x1} ${y1} A 70 70 0 ${largeArc} 1 ${x2} ${y2} Z`;

                            return (
                              <path
                                key={i}
                                d={d}
                                fill={enabled ? 'var(--color-primary)' : 'var(--color-input)'}
                                stroke="var(--color-border)"
                                strokeWidth="1"
                                onClick={() => {
                                  const newSegments = [...azimuthSegments];
                                  newSegments[i] = !newSegments[i];
                                  setAzimuthSegments(newSegments);
                                }}
                                className="cursor-pointer hover:opacity-80"
                              />
                            );
                          })}

                          {/* Degree labels at every 30° */}
                          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
                            const angle = (deg - 90) * (Math.PI / 180);
                            const x = 100 + 85 * Math.cos(angle);
                            const y = 100 + 85 * Math.sin(angle);

                            return (
                              <text
                                key={deg}
                                x={x}
                                y={y + 3}
                                textAnchor="middle"
                                className="fill-muted-foreground"
                                fontSize="9"
                                fontWeight="500"
                              >
                                {deg}°
                              </text>
                            );
                          })}

                          {/* Center dot */}
                          <circle cx="100" cy="100" r="3" fill="var(--color-primary)" />
                        </svg>
                      </Box>
                      <Text className="text-xs text-muted-foreground mt-2 text-center">
                        Click segments to exclude obstructed directions
                      </Text>
                    </div>
                </Stack>
              </Card>
            )}
          </Stack>
        </Card>

        {/* Target Grid */}
        <div className="relative">
          {isLoading && (
            <Card
              className="absolute top-0 left-0 right-0 z-50 p-8"
              style={{ backgroundColor: 'hsl(var(--card))' }}
            >
              <div className="flex justify-center">
                <Stack className="items-center gap-2">
                  <Loader size="md" />
                  <Text className="text-sm font-medium">
                    Processing {totalCount > 0 ? totalCount.toLocaleString() : '...'} targets{loadingDots}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    This takes a while
                  </Text>
                </Stack>
              </div>
            </Card>
          )}

          {!selectedLocation && (
            <Card className="p-8">
              <Stack className="items-center gap-4">
                <IconAlertCircle size={48} stroke={1.5} className="text-warning" />
                <Text className="text-muted-foreground text-center">
                  Please select a location to view targets
                </Text>
              </Stack>
            </Card>
          )}

          {allTargets.length > 0 ? (
            <Card className="p-4">
              <Text className="text-sm text-muted-foreground mb-4">
                Showing {allTargets.length} of {totalCount} targets
                {isFetchingNextPage && ' (loading more...)'}
              </Text>

              <Virtuoso
                useWindowScroll
                data={allTargets}
                endReached={() => {
                  if (!isFetchingNextPage && hasNextPage) {
                    fetchNextPage();
                  }
                }}
                itemContent={(_index, target) => {
                  const isAdded = addedTargets.has(target.id);
                  const imageUrl = getTargetImageUrl(target);

                  return (
                    <Card key={target.id} className="p-2 mb-2" style={{ backgroundColor: 'hsl(var(--card))' }}>
                      <Group className="items-start gap-3">
                        {/* Preview Image - Click to enlarge */}
                        <Box
                          className="min-w-[130px] w-[130px] cursor-pointer"
                          onClick={() => handleImageClick(target)}
                        >
                          <img
                            src={imageUrl}
                            alt={target.name}
                            loading="lazy"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              img.src = 'https://placehold.co/130x130/0d1117/white?text=No+Image';
                            }}
                            className="rounded-sm transition-transform hover:scale-105"
                            style={{ width: 130, height: 130, objectFit: 'cover' }}
                          />
                        </Box>

                        {/* Target Info */}
                        <Stack className="gap-0.5 flex-1 min-w-[150px]">
                          <div>
                            <Group className="gap-2 mb-1">
                              {target.messierId && (
                                <Badge variant="default" className="text-xs">
                                  {target.messierId}
                                </Badge>
                              )}
                              <Text className="font-semibold text-sm text-green-500">
                                {target.name}
                              </Text>
                            </Group>
                            {target.catalogId && (
                              <Text className="text-xs text-muted-foreground">
                                {target.catalogId}
                              </Text>
                            )}
                          </div>

                          <Group className="gap-2">
                            <Text className="text-xs text-muted-foreground">
                              <span className="font-semibold">RA</span> {formatRA(target.dynamicRaDeg ?? target.raDeg)}
                            </Text>
                            <Text className="text-xs text-muted-foreground">
                              <span className="font-semibold">Type:</span> {target.type}
                            </Text>
                          </Group>

                          <Group className="gap-2">
                            <Text className="text-xs text-muted-foreground">
                              <span className="font-semibold">DEC</span> {formatDec(target.dynamicDecDeg ?? target.decDeg)}
                            </Text>
                            {target.sizeMajorArcmin && (
                              <Text className="text-xs text-muted-foreground">
                                <span className="font-semibold">Size:</span> {target.sizeMajorArcmin.toFixed(1)}′
                                {target.sizeMinorArcmin && ` x ${target.sizeMinorArcmin.toFixed(1)}′`}
                              </Text>
                            )}
                          </Group>

                          {target.magnitude && (
                            <Text className="text-xs text-muted-foreground">
                              <span className="font-semibold">Mag:</span> {target.magnitude.toFixed(1)}
                            </Text>
                          )}

                          <Group className="gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {target.type}
                            </Badge>
                            {target.constellation && (
                              <Badge variant="outline" className="text-xs">
                                {target.constellation}
                              </Badge>
                            )}
                            {session && (
                              <>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleToggleWishlist(target.id)}
                                        disabled={addMutation.isPending || removeMutation.isPending}
                                      >
                                        {isAdded ? <IconHeartFilled className="h-3.5 w-3.5 text-red-500" /> : <IconHeart className="h-3.5 w-3.5" />}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {isAdded ? 'Remove from wishlist' : 'Add to wishlist'}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                {!target.isDynamic && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => handleFindBestDate(target)}
                                        >
                                          <IconCalendarSearch className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Find best observation date
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleCreateSession(target.id, target.name)}
                                        disabled={!selectedGear || !selectedLocation || createSessionMutation.isPending}
                                      >
                                        <IconPlus className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {selectedGear ? 'Create session with this target' : 'Select gear to create session'}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </>
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
                          <Stack className="gap-2 items-center">
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
                    </Card>
                  );
                }}
                components={{
                  Footer: () => hasNextPage ? (
                    <Card className="p-4 my-2" style={{ backgroundColor: 'hsl(var(--card))' }}>
                      <div className="flex justify-center items-center gap-2">
                        <Loader size="sm" />
                        <Text className="text-sm text-muted-foreground">Loading more targets...</Text>
                      </div>
                    </Card>
                  ) : null,
                }}
              />
            </Card>
          ) : (
            !isLoading &&
            selectedLocation && (
              <Card className="p-8">
                <Text className="text-muted-foreground text-center py-8">
                  No targets found. Try adjusting your filters.
                </Text>
              </Card>
            )
          )}
        </div>
      </Stack>

      {/* Image Modal */}
      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedImageTarget?.name || 'Target Image'}</DialogTitle>
          </DialogHeader>
          {selectedImageTarget && (
            <Stack className="gap-4">
              <Box className="relative">
                {imageLoading && (
                  <div
                    className="absolute inset-0 z-10 flex items-center justify-center rounded-lg"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
                  >
                    <Stack className="items-center gap-2">
                      <Loader size="lg" />
                      <Text className="text-sm text-muted-foreground">
                        Loading high-quality image...
                      </Text>
                    </Stack>
                  </div>
                )}
                <img
                  src={getHighQualityImageUrl(selectedImageTarget)}
                  alt={selectedImageTarget.name}
                  onLoad={() => setImageLoading(false)}
                  onError={() => setImageLoading(false)}
                  className="rounded-md w-full"
                  style={{ maxHeight: '70vh', objectFit: 'contain' }}
                />
              </Box>
              <Stack className="gap-2">
                <Group className="justify-between">
                  <Text className="text-lg font-semibold">{selectedImageTarget.name}</Text>
                  <Badge>
                    {selectedImageTarget.type}
                  </Badge>
                </Group>
                {selectedImageTarget.constellation && (
                  <Text className="text-sm text-muted-foreground">
                    Constellation: {selectedImageTarget.constellation}
                  </Text>
                )}
                {selectedImageTarget.magnitude !== null && (
                  <Text className="text-sm text-muted-foreground">
                    Magnitude: {selectedImageTarget.magnitude.toFixed(1)}
                  </Text>
                )}
                {selectedImageTarget.sizeMajorArcmin && (
                  <Text className="text-sm text-muted-foreground">
                    Size: {selectedImageTarget.sizeMajorArcmin.toFixed(1)}′ × {selectedImageTarget.sizeMinorArcmin?.toFixed(1) || '?'}′
                  </Text>
                )}
              </Stack>
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      {/* Scroll to top button */}
      <Button
        variant="default"
        size="icon"
        className="fixed bottom-6 right-6 rounded-full shadow-lg transition-opacity z-50"
        style={{
          opacity: showScrollTop ? 1 : 0,
          visibility: showScrollTop ? 'visible' : 'hidden',
        }}
        onClick={scrollToTop}
        aria-label="Scroll to top"
      >
        <IconArrowUp size={24} />
      </Button>
    </Container>
  );
}
