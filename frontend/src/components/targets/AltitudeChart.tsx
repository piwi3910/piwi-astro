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
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Group } from '@/components/ui/group';
import { Stack } from '@/components/ui/stack';
import { Card } from '@/components/ui/card';
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
}: AltitudeChartProps) {
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
      <Card p="xl" withBorder>
        <Text c="dimmed" ta="center">
          No visibility data available for this date
        </Text>
      </Card>
    );
  }

  const maxAltitude = Math.max(...data.map((d) => d.altitude));
  const minAltitude = Math.min(...data.map((d) => d.altitude));

  return (
    <Stack gap="md">
      {/* Info Cards */}
      <Group grow>
        {transit && (
          <Card p="md" withBorder>
            <Group gap="xs">
              <IconTarget size={20} color="#228be6" />
              <div>
                <Text size="xs" c="dimmed">
                  Meridian Transit
                </Text>
                <Text fw="semibold">
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
          </Card>
        )}

        <Card p="md" withBorder>
          <Group gap="xs">
            <IconSun size={20} color="#fd7e14" />
            <div>
              <Text size="xs" c="dimmed">
                Observing Window
              </Text>
              <Text fw="semibold">
                {data[0].timeFormatted} - {data[data.length - 1].timeFormatted}
              </Text>
              <Text size="xs" c="dimmed">
                Peak: {maxAltitude.toFixed(1)}°
              </Text>
            </div>
          </Group>
        </Card>

        {showMoon && data[0].moonIllumination !== undefined && (
          <Card p="md" withBorder>
            <Group gap="xs">
              <IconMoon size={20} color="#fab005" />
              <div>
                <Text size="xs" c="dimmed">
                  Moon Phase
                </Text>
                <Text fw="semibold">{data[0].moonIllumination.toFixed(0)}%</Text>
                <Text size="xs" c="dimmed">
                  {data[0].moonIllumination < 25
                    ? 'Dark'
                    : data[0].moonIllumination < 75
                    ? 'Moderate'
                    : 'Bright'}
                </Text>
              </div>
            </Group>
          </Card>
        )}
      </Group>

      {/* Chart */}
      <Box className="w-full h-[400px]">
        <ResponsiveContainer>
          <ComposedChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#424242" />
            <XAxis
              dataKey="timeFormatted"
              stroke="#8b949e"
              style={{ fontSize: '12px' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke="#8b949e"
              style={{ fontSize: '12px' }}
              label={{
                value: 'Altitude (degrees)',
                angle: -90,
                position: 'insideLeft',
                style: { fill: '#8b949e' },
              }}
              domain={[Math.max(0, minAltitude - 10), Math.min(90, maxAltitude + 10)]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#2e2e2e',
                border: '1px solid #424242',
                borderRadius: '4px',
              }}
              labelStyle={{ color: '#c9d1d9' }}
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
              fill="#1864ab"
              fillOpacity={0.2}
              stroke="none"
            />

            {/* Reference line at horizon */}
            <ReferenceLine
              y={0}
              stroke="#fa5252"
              strokeDasharray="3 3"
              label={{
                value: 'Horizon',
                position: 'right',
                style: { fill: '#fa5252', fontSize: '11px' },
              }}
            />

            {/* Reference line at 30 degrees (minimum good altitude) */}
            <ReferenceLine
              y={30}
              stroke="#40c057"
              strokeDasharray="3 3"
              label={{
                value: 'Min. Good Alt',
                position: 'right',
                style: { fill: '#40c057', fontSize: '11px' },
              }}
            />

            {/* Target altitude line */}
            <Line
              type="monotone"
              dataKey="altitude"
              stroke="#228be6"
              strokeWidth={2}
              dot={false}
              name="Target Altitude"
            />

            {/* Moon altitude line */}
            {showMoon && (
              <Line
                type="monotone"
                dataKey="moonAltitude"
                stroke="#fab005"
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
        <Text size="sm" fw="semibold">
          Observing Conditions:
        </Text>
        {maxAltitude > 60 && (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
            Excellent Altitude
          </Badge>
        )}
        {maxAltitude > 30 && maxAltitude <= 60 && (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
            Good Altitude
          </Badge>
        )}
        {maxAltitude <= 30 && (
          <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">
            Low Altitude
          </Badge>
        )}
        {showMoon && data[0].moonIllumination !== undefined && (
          <>
            {data[0].moonIllumination < 25 && (
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                Dark Moon
              </Badge>
            )}
            {data[0].moonIllumination >= 25 && data[0].moonIllumination < 75 && (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                Moderate Moon
              </Badge>
            )}
            {data[0].moonIllumination >= 75 && (
              <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">
                Bright Moon
              </Badge>
            )}
          </>
        )}
      </Group>
    </Stack>
  );
}
