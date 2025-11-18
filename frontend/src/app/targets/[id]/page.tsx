'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  Badge,
  Card,
  Image,
  Grid,
  Paper,
  Select,
  Skeleton,
  Button,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { DatePicker } from '@mantine/dates';
import {
  IconTarget,
  IconRuler,
  IconMapPin,
  IconStar,
} from '@tabler/icons-react';
import { AltitudeChart } from '@/components/targets/AltitudeChart';
import { getDSSImageUrl, calculateFOV } from '@/utils/targetImages';
import type { ObserverLocation, TargetCoordinates } from '@/utils/astronomical';

interface Target {
  id: string;
  catalogId: string | null;
  name: string;
  type: string;
  raDeg: number;
  decDeg: number;
  sizeMajorArcmin: number | null;
  sizeMinorArcmin: number | null;
  magnitude: number | null;
  constellation: string | null;
}

interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  bortleScale: number | null;
  elevation: number | null;
}

async function fetchTarget(id: string): Promise<Target> {
  const response = await fetch(`/api/targets/${id}`);
  if (!response.ok) throw new Error('Failed to fetch target');
  return response.json();
}

async function fetchLocations(): Promise<Location[]> {
  const response = await fetch('/api/locations');
  if (!response.ok) throw new Error('Failed to fetch locations');
  return response.json();
}

export default function TargetDetailPage() {
  const params = useParams();
  const targetId = params.id as string;

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [observationDate, setObservationDate] = useState<Date | null>(new Date());

  const { data: target, isLoading: targetLoading } = useQuery({
    queryKey: ['target', targetId],
    queryFn: () => fetchTarget(targetId),
  });

  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
  });

  // Auto-select first favorite or first location
  const selectedLocation = locations?.find((loc) => loc.id === selectedLocationId) ||
    locations?.find((loc) => loc.bortleScale && loc.bortleScale <= 4) ||
    locations?.[0];

  if (targetLoading || !target) {
    return (
      <Container size="lg" py="xl">
        <Stack gap="lg">
          <Skeleton height={50} />
          <Skeleton height={400} />
        </Stack>
      </Container>
    );
  }

  const imageUrl = getDSSImageUrl(
    target.raDeg,
    target.decDeg,
    calculateFOV(target.sizeMajorArcmin, target.sizeMinorArcmin)
  );

  const targetCoords: TargetCoordinates = {
    raDeg: target.raDeg,
    decDeg: target.decDeg,
  };

  const observer: ObserverLocation | null = selectedLocation
    ? {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        elevation: selectedLocation.elevation || 0,
      }
    : null;

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <div>
          <Group gap="xs" mb="xs">
            <IconTarget size={32} />
            <Title order={1}>{target.name}</Title>
            {target.catalogId && (
              <Badge size="lg" variant="light">
                {target.catalogId}
              </Badge>
            )}
          </Group>
          <Text size="lg" c="dimmed">
            {target.type}
            {target.constellation && ` in ${target.constellation}`}
          </Text>
        </div>

        <Grid>
          {/* Target Image */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card shadow="sm" padding="lg" withBorder>
              <Card.Section>
                <Image
                  src={imageUrl}
                  height={400}
                  alt={target.name}
                  fit="contain"
                  fallbackSrc="https://placehold.co/600x400?text=Loading+Sky+Image"
                />
              </Card.Section>
              <Text size="xs" c="dimmed" mt="xs" ta="center">
                Image from Digitized Sky Survey (DSS)
              </Text>
            </Card>
          </Grid.Col>

          {/* Target Information */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="md">
              <Paper p="md" withBorder>
                <Text fw={600} size="lg" mb="md">
                  Object Details
                </Text>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Type
                    </Text>
                    <Badge>{target.type}</Badge>
                  </Group>

                  {target.constellation && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Constellation
                      </Text>
                      <Text size="sm">{target.constellation}</Text>
                    </Group>
                  )}

                  {target.magnitude && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Magnitude
                      </Text>
                      <Group gap="xs">
                        <IconStar size={16} />
                        <Text size="sm">{target.magnitude.toFixed(1)}</Text>
                      </Group>
                    </Group>
                  )}

                  {target.sizeMajorArcmin && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Size
                      </Text>
                      <Group gap="xs">
                        <IconRuler size={16} />
                        <Text size="sm">
                          {target.sizeMajorArcmin.toFixed(1)}′ × {target.sizeMinorArcmin?.toFixed(1) || '?'}′
                        </Text>
                      </Group>
                    </Group>
                  )}
                </Stack>
              </Paper>

              <Paper p="md" withBorder>
                <Text fw={600} size="lg" mb="md">
                  Coordinates (J2000)
                </Text>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Right Ascension
                    </Text>
                    <Text size="sm" fw={500}>
                      {target.raDeg.toFixed(4)}°
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Declination
                    </Text>
                    <Text size="sm" fw={500}>
                      {target.decDeg.toFixed(4)}°
                    </Text>
                  </Group>
                </Stack>
              </Paper>
            </Stack>
          </Grid.Col>
        </Grid>

        {/* Visibility Section */}
        <div>
          <Title order={2} size="h3" mb="md">
            Visibility & Planning
          </Title>

          <Stack gap="md">
            {/* Location and Date Selection */}
            <Group grow>
              <Select
                label="Observation Location"
                placeholder="Select location"
                data={
                  locations?.map((loc) => ({
                    value: loc.id,
                    label: `${loc.name}${loc.bortleScale ? ` (Bortle ${loc.bortleScale})` : ''}`,
                  })) || []
                }
                value={selectedLocationId}
                onChange={setSelectedLocationId}
                leftSection={<IconMapPin size={16} />}
                disabled={locationsLoading || !locations || locations.length === 0}
              />

              <div>
                <Text size="sm" fw={500} mb={4}>Observation Date</Text>
                <DatePicker
                  value={observationDate}
                  onChange={(value: Date | null) => setObservationDate(value)}
                  minDate={new Date()}
                />
              </div>
            </Group>

            {!locations || locations.length === 0 ? (
              <Paper p="xl" withBorder>
                <Stack align="center" gap="md">
                  <IconMapPin size={48} stroke={1.5} color="gray" />
                  <Text c="dimmed" ta="center">
                    No locations saved yet. Add a location to see visibility data.
                  </Text>
                  <Button component="a" href="/dashboard/locations">
                    Add Location
                  </Button>
                </Stack>
              </Paper>
            ) : observer && observationDate ? (
              <Card shadow="sm" padding="lg" withBorder>
                <Text fw={600} size="lg" mb="md">
                  Altitude & Visibility Chart
                </Text>
                <AltitudeChart
                  target={targetCoords}
                  observer={observer}
                  date={observationDate}
                  showMoon={true}
                />
              </Card>
            ) : null}
          </Stack>
        </div>
      </Stack>
    </Container>
  );
}
