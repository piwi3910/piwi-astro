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
  CardContent,
  Grid,
  GridCol,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Skeleton,
  Button,
} from '@/components/ui';
import { useQuery } from '@tanstack/react-query';
import { DatePicker } from '@/components/ui';
import {
  IconTarget,
  IconRuler,
  IconMapPin,
  IconStar,
} from '@tabler/icons-react';
import { AltitudeChart } from '@/components/targets/AltitudeChart';
import { getDSSImageUrl, calculateFOV } from '@/utils/targetImages';
import type { ObserverLocation, TargetCoordinates } from '@/utils/astronomical';
import Image from 'next/image';

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
      <Container size="lg" className="py-8">
        <Stack gap="lg">
          <Skeleton className="h-[50px]" />
          <Skeleton className="h-[400px]" />
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
    <Container size="xl" className="py-8">
      <Stack gap="xl">
        {/* Header */}
        <div>
          <Group gap="xs" className="mb-2">
            <IconTarget size={32} />
            <Title order={1}>{target.name}</Title>
            {target.catalogId && (
              <Badge size="lg" variant="secondary">
                {target.catalogId}
              </Badge>
            )}
          </Group>
          <Text size="lg" className="text-muted-foreground">
            {target.type}
            {target.constellation && ` in ${target.constellation}`}
          </Text>
        </div>

        <Grid>
          {/* Target Image */}
          <GridCol span={{ base: 12, md: 6 }}>
            <Card className="shadow-sm">
              <div className="relative w-full h-[400px]">
                <Image
                  src={imageUrl}
                  alt={target.name}
                  fill
                  className="object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://placehold.co/600x400?text=Loading+Sky+Image';
                  }}
                />
              </div>
              <CardContent className="pt-3">
                <Text size="xs" className="text-muted-foreground text-center">
                  Image from Digitized Sky Survey (DSS)
                </Text>
              </CardContent>
            </Card>
          </GridCol>

          {/* Target Information */}
          <GridCol span={{ base: 12, md: 6 }}>
            <Stack gap="md">
              <Card className="p-4">
                <Text className="font-semibold text-lg mb-4">
                  Object Details
                </Text>
                <Stack gap="sm">
                  <Group justify="between">
                    <Text size="sm" className="text-muted-foreground">
                      Type
                    </Text>
                    <Badge>{target.type}</Badge>
                  </Group>

                  {target.constellation && (
                    <Group justify="between">
                      <Text size="sm" className="text-muted-foreground">
                        Constellation
                      </Text>
                      <Text size="sm">{target.constellation}</Text>
                    </Group>
                  )}

                  {target.magnitude && (
                    <Group justify="between">
                      <Text size="sm" className="text-muted-foreground">
                        Magnitude
                      </Text>
                      <Group gap="xs">
                        <IconStar size={16} />
                        <Text size="sm">{target.magnitude.toFixed(1)}</Text>
                      </Group>
                    </Group>
                  )}

                  {target.sizeMajorArcmin && (
                    <Group justify="between">
                      <Text size="sm" className="text-muted-foreground">
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
              </Card>

              <Card className="p-4">
                <Text className="font-semibold text-lg mb-4">
                  Coordinates (J2000)
                </Text>
                <Stack gap="sm">
                  <Group justify="between">
                    <Text size="sm" className="text-muted-foreground">
                      Right Ascension
                    </Text>
                    <Text size="sm" className="font-medium">
                      {target.raDeg.toFixed(4)}°
                    </Text>
                  </Group>
                  <Group justify="between">
                    <Text size="sm" className="text-muted-foreground">
                      Declination
                    </Text>
                    <Text size="sm" className="font-medium">
                      {target.decDeg.toFixed(4)}°
                    </Text>
                  </Group>
                </Stack>
              </Card>
            </Stack>
          </GridCol>
        </Grid>

        {/* Visibility Section */}
        <div>
          <Title order={2} size="lg" className="mb-4">
            Visibility & Planning
          </Title>

          <Stack gap="md">
            {/* Location and Date Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Text size="sm" className="font-medium mb-2 flex items-center gap-2">
                  <IconMapPin size={16} />
                  Observation Location
                </Text>
                <Select
                  value={selectedLocationId || undefined}
                  onValueChange={setSelectedLocationId}
                  disabled={locationsLoading || !locations || locations.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}{loc.bortleScale ? ` (Bortle ${loc.bortleScale})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Text size="sm" className="font-medium mb-2">Observation Date</Text>
                <DatePicker
                  value={observationDate || undefined}
                  onChange={(date: Date | undefined) => setObservationDate(date || null)}
                  minDate={new Date()}
                />
              </div>
            </div>

            {!locations || locations.length === 0 ? (
              <Card className="p-8">
                <Stack align="center" gap="md">
                  <IconMapPin size={48} stroke={1.5} className="text-muted-foreground" />
                  <Text className="text-muted-foreground text-center">
                    No locations saved yet. Add a location to see visibility data.
                  </Text>
                  <Button asChild>
                    <a href="/dashboard/locations">
                      Add Location
                    </a>
                  </Button>
                </Stack>
              </Card>
            ) : observer && observationDate ? (
              <Card className="shadow-sm">
                <CardContent className="p-6">
                  <Text className="font-semibold text-lg mb-4">
                    Altitude & Visibility Chart
                  </Text>
                  <AltitudeChart
                    target={targetCoords}
                    observer={observer}
                    date={observationDate}
                    showMoon={true}
                  />
                </CardContent>
              </Card>
            ) : null}
          </Stack>
        </div>
      </Stack>
    </Container>
  );
}
