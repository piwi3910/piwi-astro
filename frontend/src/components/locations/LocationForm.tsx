'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Textarea,
  Button,
  Stack,
  Group,
  Switch,
  Select,
  Text,
  Paper,
} from '@mantine/core';
import { LocationMap } from './LocationMap';

interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  bortleScale?: number | null;
  isFavorite: boolean;
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

interface LocationFormProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: LocationFormData) => void | Promise<void>;
  initialData?: LocationFormData;
  isLoading?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  allLocations?: Location[];
  isEditing?: boolean;
}

const BORTLE_OPTIONS = [
  { value: '1', label: 'Class 1 - Excellent dark sky' },
  { value: '2', label: 'Class 2 - Typical dark sky' },
  { value: '3', label: 'Class 3 - Rural sky' },
  { value: '4', label: 'Class 4 - Rural/suburban transition' },
  { value: '5', label: 'Class 5 - Suburban sky' },
  { value: '6', label: 'Class 6 - Bright suburban sky' },
  { value: '7', label: 'Class 7 - Suburban/urban transition' },
  { value: '8', label: 'Class 8 - City sky' },
  { value: '9', label: 'Class 9 - Inner-city sky' },
];

export function LocationForm({
  opened,
  onClose,
  onSubmit,
  initialData,
  isLoading,
  onMapClick,
  allLocations = [],
  isEditing = false,
}: LocationFormProps): JSX.Element {
  const [formData, setFormData] = useState<LocationFormData>({
    name: '',
    latitude: 0,
    longitude: 0,
    bortleScale: null,
    elevation: null,
    timezone: null,
    notes: null,
    isFavorite: false,
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  // Update coordinates when user clicks on map (for both add and edit modes)
  useEffect(() => {
    if (initialData?.latitude && initialData?.longitude) {
      setFormData(prev => ({
        ...prev,
        latitude: initialData.latitude,
        longitude: initialData.longitude,
        elevation: initialData.elevation ?? prev.elevation,
        timezone: initialData.timezone ?? prev.timezone,
      }));
    }
  }, [initialData?.latitude, initialData?.longitude, initialData?.elevation, initialData?.timezone]);

  // Determine map center based on form data or default
  const mapCenter: [number, number] = formData.latitude && formData.longitude
    ? [formData.latitude, formData.longitude]
    : allLocations.length > 0
    ? [allLocations[0].latitude, allLocations[0].longitude]
    : [50.8503, 4.3517]; // Default to Brussels

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
    // Reset form after successful submission
    if (!initialData) {
      setFormData({
        name: '',
        latitude: 0,
        longitude: 0,
        bortleScale: null,
        elevation: null,
        timezone: null,
        notes: null,
        isFavorite: false,
      });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEditing ? 'Edit Location' : 'Add New Location'}
      size="xl"
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Paper withBorder p="md">
            <Text fw={600} mb="md">
              {isEditing ? 'Location on Map (drag marker or click to reposition)' : 'Click on the map to select a location'}
            </Text>
            <LocationMap
              locations={allLocations}
              center={mapCenter}
              height={400}
              zoom={initialData ? 12 : 8}
              onMapClick={onMapClick}
              selectedPosition={formData.latitude && formData.longitude ? { lat: formData.latitude, lng: formData.longitude } : null}
            />
          </Paper>

          <TextInput
            label="Location Name"
            placeholder="My backyard"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <Group grow>
            <TextInput
              label="Latitude"
              value={formData.latitude.toFixed(6)}
              disabled
              description="Selected from map"
            />

            <TextInput
              label="Longitude"
              value={formData.longitude.toFixed(6)}
              disabled
              description="Selected from map"
            />
          </Group>

          <Group grow>
            <TextInput
              label="Elevation"
              value={
                formData.elevation !== null && formData.elevation !== undefined
                  ? `${formData.elevation.toFixed(0)}m`
                  : 'Calculating...'
              }
              disabled
              description="Auto-detected from location"
            />

            <TextInput
              label="Timezone"
              value={formData.timezone || 'Calculating...'}
              disabled
              description="Auto-detected from location"
            />
          </Group>

          <Textarea
            label="Notes"
            placeholder="Additional information about this location..."
            minRows={3}
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
          />

          <Switch
            label="Mark as favorite location"
            checked={formData.isFavorite}
            onChange={(e) => setFormData({ ...formData, isFavorite: e.currentTarget.checked })}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" loading={isLoading}>
              {isEditing ? 'Update Location' : 'Add Location'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
