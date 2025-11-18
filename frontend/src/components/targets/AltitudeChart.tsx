'use client';

import { useMemo } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { Box, Text, Badge, Group, Stack, Paper } from '@mantine/core';
import { IconMoon, IconSun, IconTarget } from '@tabler/icons-react';
import {
  calculateNightVisibility,
  calculateMeridianTransit,
  calculateMoonData,
  type ObserverLocation,
  type TargetCoordinates,
  type AltitudeData,
} from '@/utils/astronomical';

interface AltitudeChartProps {
  target: TargetCoordinates;
  observer: ObserverLocation;
  date: Date;
  showMoon?: boolean;
}

interface ChartDataPoint extends AltitudeData {
  moonAltitude?: number;
  moonIllumination?: number;
  timeFormatted: string;
}

export function AltitudeChart({
  target,
  observer,
  date,
  showMoon = true,
}: AltitudeChartProps): JSX.Element {
  const chartData = useMemo(() => {
    const nightData = calculateNightVisibility(target, observer, date, 15);
    const transit = calculateMeridianTransit(target, observer, date);

    const data: ChartDataPoint[] = nightData.map((point) => {
      const moonData = showMoon ? calculateMoonData(observer, point.time) : null;

      return {
        ...point,
        moonAltitude: moonData?.altitude,
        moonIllumination: moonData?.illumination,
        timeFormatted: point.time.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
    });

    return { data, transit };
  }, [target, observer, date, showMoon]);

  const { data, transit } = chartData;

  if (data.length === 0) {
    return (
      <Paper p="xl" withBorder>
        <Text c="dimmed" ta="center">
          No visibility data available for this date
        </Text>
      </Paper>
    );
  }

  const maxAltitude = Math.max(...data.map((d) => d.altitude));
  const minAltitude = Math.min(...data.map((d) => d.altitude));

  return (
    <Stack gap="md">
      {/* Info Cards */}
      <Group grow>
        {transit && (
          <Paper p="md" withBorder>
            <Group gap="xs">
              <IconTarget size={20} color="var(--mantine-color-blue-5)" />
              <div>
                <Text size="xs" c="dimmed">
                  Meridian Transit
                </Text>
                <Text fw={600}>
                  {transit.time.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                <Text size="xs" c="dimmed">
                  Altitude: {transit.altitude.toFixed(1)}°
                </Text>
              </div>
            </Group>
          </Paper>
        )}

        <Paper p="md" withBorder>
          <Group gap="xs">
            <IconSun size={20} color="var(--mantine-color-orange-5)" />
            <div>
              <Text size="xs" c="dimmed">
                Observing Window
              </Text>
              <Text fw={600}>
                {data[0].timeFormatted} - {data[data.length - 1].timeFormatted}
              </Text>
              <Text size="xs" c="dimmed">
                Peak: {maxAltitude.toFixed(1)}°
              </Text>
            </div>
          </Group>
        </Paper>

        {showMoon && data[0].moonIllumination !== undefined && (
          <Paper p="md" withBorder>
            <Group gap="xs">
              <IconMoon size={20} color="var(--mantine-color-yellow-5)" />
              <div>
                <Text size="xs" c="dimmed">
                  Moon Phase
                </Text>
                <Text fw={600}>{data[0].moonIllumination.toFixed(0)}%</Text>
                <Text size="xs" c="dimmed">
                  {data[0].moonIllumination < 25
                    ? 'Dark'
                    : data[0].moonIllumination < 75
                    ? 'Moderate'
                    : 'Bright'}
                </Text>
              </div>
            </Group>
          </Paper>
        )}
      </Group>

      {/* Chart */}
      <Box style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <ComposedChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-dark-4)" />
            <XAxis
              dataKey="timeFormatted"
              stroke="var(--mantine-color-gray-6)"
              style={{ fontSize: '12px' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke="var(--mantine-color-gray-6)"
              style={{ fontSize: '12px' }}
              label={{
                value: 'Altitude (degrees)',
                angle: -90,
                position: 'insideLeft',
                style: { fill: 'var(--mantine-color-gray-6)' },
              }}
              domain={[Math.max(0, minAltitude - 10), Math.min(90, maxAltitude + 10)]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--mantine-color-dark-6)',
                border: '1px solid var(--mantine-color-dark-4)',
                borderRadius: '4px',
              }}
              labelStyle={{ color: 'var(--mantine-color-gray-3)' }}
              formatter={(value: number, name: string) => [
                `${value.toFixed(1)}°`,
                name === 'altitude'
                  ? 'Target Altitude'
                  : name === 'moonAltitude'
                  ? 'Moon Altitude'
                  : name,
              ]}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />

            {/* Highlight area above 30 degrees (good observing) */}
            <Area
              type="monotone"
              dataKey="altitude"
              fill="var(--mantine-color-blue-9)"
              fillOpacity={0.2}
              stroke="none"
            />

            {/* Reference line at horizon */}
            <ReferenceLine
              y={0}
              stroke="var(--mantine-color-red-6)"
              strokeDasharray="3 3"
              label={{
                value: 'Horizon',
                position: 'right',
                style: { fill: 'var(--mantine-color-red-6)', fontSize: '11px' },
              }}
            />

            {/* Reference line at 30 degrees (minimum good altitude) */}
            <ReferenceLine
              y={30}
              stroke="var(--mantine-color-green-6)"
              strokeDasharray="3 3"
              label={{
                value: 'Min. Good Alt',
                position: 'right',
                style: { fill: 'var(--mantine-color-green-6)', fontSize: '11px' },
              }}
            />

            {/* Target altitude line */}
            <Line
              type="monotone"
              dataKey="altitude"
              stroke="var(--mantine-color-blue-5)"
              strokeWidth={2}
              dot={false}
              name="Target Altitude"
            />

            {/* Moon altitude line */}
            {showMoon && (
              <Line
                type="monotone"
                dataKey="moonAltitude"
                stroke="var(--mantine-color-yellow-5)"
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 5"
                name="Moon Altitude"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </Box>

      {/* Quality Indicators */}
      <Group gap="xs">
        <Text size="sm" fw={600}>
          Observing Conditions:
        </Text>
        {maxAltitude > 60 && (
          <Badge color="green" variant="light">
            Excellent Altitude
          </Badge>
        )}
        {maxAltitude > 30 && maxAltitude <= 60 && (
          <Badge color="blue" variant="light">
            Good Altitude
          </Badge>
        )}
        {maxAltitude <= 30 && (
          <Badge color="orange" variant="light">
            Low Altitude
          </Badge>
        )}
        {showMoon && data[0].moonIllumination !== undefined && (
          <>
            {data[0].moonIllumination < 25 && (
              <Badge color="green" variant="light">
                Dark Moon
              </Badge>
            )}
            {data[0].moonIllumination >= 25 && data[0].moonIllumination < 75 && (
              <Badge color="yellow" variant="light">
                Moderate Moon
              </Badge>
            )}
            {data[0].moonIllumination >= 75 && (
              <Badge color="orange" variant="light">
                Bright Moon
              </Badge>
            )}
          </>
        )}
      </Group>
    </Stack>
  );
}
