'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Button,
  Stack,
  Card,
  Group,
  Badge,
  ActionIcon,
  Grid,
  Paper,
  Box,
  Menu,
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
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
function LocationMapPreview({ latitude, longitude, name }: { latitude: number; longitude: number; name: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Box
        style={{
          width: '100%',
          height: 150,
          borderRadius: 8,
          backgroundColor: 'var(--mantine-color-dark-6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text size="xs" c="dimmed">Loading map...</Text>
      </Box>
    );
  }

  return (
    <Box
      style={{
        width: '100%',
        height: 150,
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid var(--mantine-color-dark-4)',
        position: 'relative',
        zIndex: 0,
      }}
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

export default function LocationsPage(): JSX.Element {
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
      notifications.show({
        title: 'Success',
        message: 'Location created successfully',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to create location',
        color: 'red',
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
      notifications.show({
        title: 'Success',
        message: 'Location updated successfully',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to update location',
        color: 'red',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      notifications.show({
        title: 'Success',
        message: 'Location deleted successfully',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete location',
        color: 'red',
      });
    },
  });

  const handleMapClick = async (lat: number, lng: number) => {
    setSelectedCoords({ lat, lng });

    // Show loading notification
    const loadingNotification = notifications.show({
      title: 'Fetching location data',
      message: 'Getting elevation and timezone data...',
      loading: true,
      autoClose: false,
    });

    // Fetch location data
    try {
      const data = await fetchLocationData(lat, lng);
      setFetchedLocationData(data);
      notifications.hide(loadingNotification);
    } catch (error) {
      console.error('Failed to fetch location data:', error);
      // Set default values if fetch fails
      setFetchedLocationData({
        elevation: null,
        timezone: null,
      });
      notifications.update({
        id: loadingNotification,
        title: 'Warning',
        message: 'Could not auto-detect all location data. Using defaults.',
        color: 'yellow',
        loading: false,
        autoClose: 3000,
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
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={1}>My Locations</Title>
            <Text c="dimmed" size="lg">
              Manage your shooting locations and plan observations
            </Text>
          </div>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={handleAddLocationClick}
          >
            Add Location
          </Button>
        </Group>

        {isLoading ? (
          <Text c="dimmed">Loading locations...</Text>
        ) : locations && locations.length > 0 ? (
          <Grid>
            {locations.map((location) => (
              <Grid.Col key={location.id} span={{ base: 12, sm: 6, md: 4 }}>
                <Card shadow="sm" padding="lg" withBorder>
                  <Stack gap="xs">
                    <Group justify="space-between" align="flex-start">
                      <Box style={{ flex: 1 }}>
                        <Group gap="xs">
                          <Text fw={600} size="lg">
                            {location.name}
                          </Text>
                          {location.isFavorite && (
                            <IconStarFilled size={16} color="gold" />
                          )}
                        </Group>
                      </Box>
                      <Menu position="bottom-end">
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray">
                            <IconDots size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconEdit size={14} />}
                            onClick={() => handleEdit(location)}
                          >
                            Edit
                          </Menu.Item>
                          <Menu.Item
                            leftSection={
                              location.isFavorite ? (
                                <IconStar size={14} />
                              ) : (
                                <IconStarFilled size={14} />
                              )
                            }
                            onClick={() => toggleFavorite(location)}
                          >
                            {location.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item
                            leftSection={<IconTrash size={14} />}
                            color="red"
                            onClick={() => handleDelete(location.id)}
                          >
                            Delete
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>

                    {/* Map preview */}
                    <Box
                      style={{ cursor: 'pointer' }}
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
              </Grid.Col>
            ))}
          </Grid>
        ) : (
          <Paper p="xl" withBorder>
            <Stack align="center" gap="md">
              <IconMapPin size={48} stroke={1.5} color="gray" />
              <Text c="dimmed" ta="center">
                No locations saved yet. Use the &quot;Add Location&quot; button to get started.
              </Text>
            </Stack>
          </Paper>
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
