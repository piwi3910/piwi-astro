'use client';

import { useState, useEffect } from 'react';
import { Container } from '@/components/ui/container';
import { Title } from '@/components/ui/title';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Stack } from '@/components/ui/stack';
import { Card } from '@/components/ui/card';
import { Group } from '@/components/ui/group';
import { Grid, GridCol } from '@/components/ui/grid';
import { Box } from '@/components/ui/box';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  IconPlus,
  IconMapPin,
  IconStar,
  IconStarFilled,
  IconEdit,
  IconTrash,
  IconDots,
} from '@tabler/icons-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { Icon } from 'leaflet';
import { LocationForm } from '@/components/locations/LocationForm';
import { fetchLocationData } from '@/utils/locationData';

// Fix for default marker icons in React Leaflet
if (typeof window !== 'undefined') {
  delete (Icon.Default.prototype as any)._getIconUrl;
  Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  bortleScale?: number | null;
  elevation?: number | null;
  timezone?: string | null;
  notes?: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LocationFormData {
  name: string;
  latitude: number;
  longitude: number;
  bortleScale?: number | null;
  elevation?: number | null;
  timezone?: string | null;
  notes?: string | null;
  isFavorite: boolean;
}

async function fetchLocations(): Promise<Location[]> {
  const response = await fetch('/api/locations');
  if (!response.ok) throw new Error('Failed to fetch locations');
  return response.json();
}

async function createLocation(data: LocationFormData): Promise<Location> {
  const response = await fetch('/api/locations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    console.error('API Error:', error);
    throw new Error(JSON.stringify(error));
  }
  return response.json();
}

async function updateLocation(id: string, data: Partial<LocationFormData>): Promise<Location> {
  const response = await fetch(`/api/locations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update location');
  return response.json();
}

async function deleteLocation(id: string): Promise<void> {
  const response = await fetch(`/api/locations/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete location');
}

// Small map preview component
function LocationMapPreview({ latitude, longitude }: { latitude: number; longitude: number; name: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Box
        className="w-full h-[150px] rounded-lg bg-input flex items-center justify-center"
      >
        <Text size="xs" c="dimmed">Loading map...</Text>
      </Box>
    );
  }

  return (
    <Box
      className="w-full h-[150px] rounded-lg overflow-hidden border border-border relative z-0"
    >
      <MapContainer
        center={[latitude, longitude]}
        zoom={8}
        style={{ width: '100%', height: '100%', zIndex: 0 }}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} />
      </MapContainer>
    </Box>
  );
}

export default function LocationsPage() {
  const [formOpened, setFormOpened] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [fetchedLocationData, setFetchedLocationData] = useState<{
    elevation: number | null;
    timezone: string | null;
  } | null>(null);

  const queryClient = useQueryClient();

  const { data: locations, isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
  });

  const createMutation = useMutation({
    mutationFn: createLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setFormOpened(false);
      setSelectedCoords(null);
      toast.success('Success', {
        description: 'Location created successfully',
      });
    },
    onError: () => {
      toast.error('Error', {
        description: 'Failed to create location',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LocationFormData> }) =>
      updateLocation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setFormOpened(false);
      setEditingLocation(null);
      toast.success('Success', {
        description: 'Location updated successfully',
      });
    },
    onError: () => {
      toast.error('Error', {
        description: 'Failed to update location',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Success', {
        description: 'Location deleted successfully',
      });
    },
    onError: () => {
      toast.error('Error', {
        description: 'Failed to delete location',
      });
    },
  });

  const handleMapClick = async (lat: number, lng: number) => {
    setSelectedCoords({ lat, lng });

    // Show loading notification
    const loadingNotification = toast.loading('Fetching location data', {
      description: 'Getting elevation and timezone data...',
    });

    // Fetch location data
    try {
      const data = await fetchLocationData(lat, lng);
      setFetchedLocationData(data);
      toast.dismiss(loadingNotification);
    } catch (error) {
      console.error('Failed to fetch location data:', error);
      // Set default values if fetch fails
      setFetchedLocationData({
        elevation: null,
        timezone: null,
      });
      toast.dismiss(loadingNotification);
      toast.warning('Warning', {
        description: 'Could not auto-detect all location data. Using defaults.',
      });
    }
  };

  const handleAddLocationClick = () => {
    setEditingLocation(null);
    setSelectedCoords(null);
    setFetchedLocationData(null);
    setFormOpened(true);
  };

  const handleFormSubmit = async (data: LocationFormData) => {
    if (editingLocation) {
      await updateMutation.mutateAsync({ id: editingLocation.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setSelectedCoords(null);
    setFetchedLocationData({
      elevation: location.elevation ?? null,
      timezone: location.timezone ?? null,
    });
    setFormOpened(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this location?')) {
      deleteMutation.mutate(id);
    }
  };

  const toggleFavorite = (location: Location) => {
    updateMutation.mutate({
      id: location.id,
      data: { isFavorite: !location.isFavorite },
    });
  };

  return (
    <Container size="xl" className="py-8">
      <Stack gap="lg">
        <Group justify="between">
          <div>
            <Title order={1}>My Locations</Title>
            <Text c="dimmed" size="lg">
              Manage your shooting locations and plan observations
            </Text>
          </div>
          <Button
            onClick={handleAddLocationClick}
          >
            <IconPlus size={16} />
            Add Location
          </Button>
        </Group>

        {isLoading ? (
          <Text c="dimmed">Loading locations...</Text>
        ) : locations && locations.length > 0 ? (
          <Grid>
            {locations.map((location) => (
              <GridCol key={location.id} className="col-span-12 sm:col-span-6 md:col-span-4">
                <Card className="shadow-sm p-6 border">
                  <Stack gap="xs">
                    <Group justify="between" align="start">
                      <Box className="flex-1">
                        <Group gap="xs">
                          <Text fw="semibold" size="lg">
                            {location.name}
                          </Text>
                          {location.isFavorite && (
                            <IconStarFilled size={16} color="gold" />
                          )}
                        </Group>
                      </Box>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <IconDots size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(location)}>
                            <IconEdit size={14} />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleFavorite(location)}>
                            {location.isFavorite ? (
                              <IconStar size={14} />
                            ) : (
                              <IconStarFilled size={14} />
                            )}
                            {location.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDelete(location.id)}
                          >
                            <IconTrash size={14} />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </Group>

                    {/* Map preview */}
                    <Box
                      className="cursor-pointer"
                      onClick={() => handleEdit(location)}
                    >
                      <LocationMapPreview
                        latitude={location.latitude}
                        longitude={location.longitude}
                        name={location.name}
                      />
                    </Box>

                    <Group gap="xs">
                      <IconMapPin size={16} />
                      <Text size="sm" c="dimmed">
                        {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                      </Text>
                    </Group>

                    {location.elevation && (
                      <Text size="sm" c="dimmed">
                        Elevation: {location.elevation}m
                      </Text>
                    )}

                    {location.notes && (
                      <Text size="sm" c="dimmed" lineClamp={2}>
                        {location.notes}
                      </Text>
                    )}
                  </Stack>
                </Card>
              </GridCol>
            ))}
          </Grid>
        ) : (
          <Card p="xl" withBorder>
            <Stack align="center" gap="md">
              <IconMapPin size={48} stroke={1.5} color="gray" />
              <Text c="dimmed" ta="center">
                No locations saved yet. Use the &quot;Add Location&quot; button to get started.
              </Text>
            </Stack>
          </Card>
        )}
      </Stack>

      <LocationForm
        opened={formOpened}
        onClose={() => {
          setFormOpened(false);
          setEditingLocation(null);
          setSelectedCoords(null);
          setFetchedLocationData(null);
        }}
        onSubmit={handleFormSubmit}
        onMapClick={handleMapClick}
        allLocations={locations || []}
        isEditing={!!editingLocation}
        initialData={
          editingLocation && selectedCoords
            ? {
                ...editingLocation,
                latitude: selectedCoords.lat,
                longitude: selectedCoords.lng,
                elevation: fetchedLocationData?.elevation ?? editingLocation.elevation ?? null,
                timezone: fetchedLocationData?.timezone ?? editingLocation.timezone ?? null,
              }
            : editingLocation
            ? editingLocation
            : selectedCoords
            ? {
                name: '',
                latitude: selectedCoords.lat,
                longitude: selectedCoords.lng,
                elevation: fetchedLocationData?.elevation ?? null,
                timezone: fetchedLocationData?.timezone ?? null,
                notes: null,
                isFavorite: false,
              }
            : undefined
        }
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </Container>
  );
}
