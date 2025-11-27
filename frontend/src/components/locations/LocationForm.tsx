'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { TextInput } from '@/components/ui/text-input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Stack } from '@/components/ui/stack';
import { Group } from '@/components/ui/group';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
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

export function LocationForm({
  opened,
  onClose,
  onSubmit,
  initialData,
  isLoading,
  onMapClick,
  allLocations = [],
  isEditing = false,
}: LocationFormProps) {
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
    <Dialog open={opened} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Location' : 'Add New Location'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Card withBorder p="md">
              <Text fw="semibold" className="mb-4">
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
            </Card>

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

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Notes</label>
              <Textarea
                placeholder="Additional information about this location..."
                rows={3}
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="favorite-switch"
                checked={formData.isFavorite}
                onCheckedChange={(checked) => setFormData({ ...formData, isFavorite: checked })}
              />
              <label htmlFor="favorite-switch" className="text-sm font-medium text-foreground cursor-pointer">
                Mark as favorite location
              </label>
            </div>

            <DialogFooter>
              <Group justify="end" gap="md" className="mt-4">
                <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader size="sm" color="white" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    isEditing ? 'Update Location' : 'Add Location'
                  )}
                </Button>
              </Group>
            </DialogFooter>
          </Stack>
        </form>
      </DialogContent>
    </Dialog>
  );
}
