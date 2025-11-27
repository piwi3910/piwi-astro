'use client';

import { useState, useEffect } from 'react';
import { IconPlus, IconEdit, IconTrash, IconCamera } from '@tabler/icons-react';
import {
  useCameras,
  useCreateCamera,
  useUpdateCamera,
  useDeleteCamera,
  useCameraBrands,
  useCamerasByBrand,
} from '@/hooks/useGear';
import type { Camera, CreateCameraInput } from '@/types';
import { Stack } from '@/components/ui/stack';
import { Group } from '@/components/ui/group';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { TextInput } from '@/components/ui/text-input';
import { NumberInput } from '@/components/ui/number-input';
import { TextareaField } from '@/components/ui/textarea-field';
import { SelectField } from '@/components/ui/select-field';
import { Divider } from '@/components/ui/divider';
import { Alert } from '@/components/ui/alert';

export function CamerasTab() {
  const [opened, setOpened] = useState(false);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const { data: cameras, isLoading } = useCameras();
  const createMutation = useCreateCamera();
  const updateMutation = useUpdateCamera();
  const deleteMutation = useDeleteCamera();

  // Camera Catalog queries
  const { data: brandsData } = useCameraBrands();
  const { data: modelsData } = useCamerasByBrand(selectedBrand);

  const brands = brandsData?.brands || [];
  const models = modelsData?.cameras || [];

  // Form state
  const [formValues, setFormValues] = useState<CreateCameraInput>({
    catalogId: undefined,
    name: '',
    brand: '',
    model: '',
    sensorWidthMm: 0,
    sensorHeightMm: 0,
    resolutionX: 0,
    resolutionY: 0,
    pixelSizeUm: 0,
    sensorType: 'CMOS',
    notes: '',
  });

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CreateCameraInput, string>>>({});

  // Auto-fill form when camera model is selected from catalog
  useEffect(() => {
    if (selectedModelId) {
      const selectedCamera = models.find((c) => c.id === selectedModelId);
      if (selectedCamera) {
        setFormValues({
          catalogId: selectedCamera.id,
          name: `${selectedCamera.brand} ${selectedCamera.model}`,
          brand: selectedCamera.brand,
          model: selectedCamera.model,
          sensorWidthMm: selectedCamera.sensorWidthMm,
          sensorHeightMm: selectedCamera.sensorHeightMm,
          resolutionX: selectedCamera.resolutionX,
          resolutionY: selectedCamera.resolutionY,
          pixelSizeUm: selectedCamera.pixelSizeUm,
          sensorType: 'CMOS', // Default, user can change
          notes: formValues.notes, // Preserve notes if any
        });
      }
    }
  }, [selectedModelId, models]);

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof CreateCameraInput, string>> = {};

    if (!formValues.name) {
      errors.name = 'Name is required';
    }
    if (formValues.sensorWidthMm <= 0) {
      errors.sensorWidthMm = 'Sensor width must be positive';
    }
    if (formValues.sensorHeightMm <= 0) {
      errors.sensorHeightMm = 'Sensor height must be positive';
    }
    if (formValues.resolutionX <= 0) {
      errors.resolutionX = 'Resolution X must be positive';
    }
    if (formValues.resolutionY <= 0) {
      errors.resolutionY = 'Resolution Y must be positive';
    }
    if (formValues.pixelSizeUm <= 0) {
      errors.pixelSizeUm = 'Pixel size must be positive';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (editingCamera) {
        await updateMutation.mutateAsync({ id: editingCamera.id, data: formValues });
      } else {
        await createMutation.mutateAsync(formValues);
      }
      handleClose();
    } catch (error) {
      console.error('Failed to save camera:', error);
    }
  };

  const handleEdit = (camera: Camera): void => {
    setEditingCamera(camera);
    setFormValues({
      name: camera.name,
      brand: camera.brand || '',
      model: camera.model || '',
      sensorWidthMm: camera.sensorWidthMm,
      sensorHeightMm: camera.sensorHeightMm,
      resolutionX: camera.resolutionX,
      resolutionY: camera.resolutionY,
      pixelSizeUm: camera.pixelSizeUm,
      sensorType: camera.sensorType,
      notes: camera.notes || '',
    });
    setFormErrors({});
    setOpened(true);
  };

  const handleDelete = async (id: string): Promise<void> => {
    try {
      await deleteMutation.mutateAsync(id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete camera:', error);
    }
  };

  const handleClose = (): void => {
    setOpened(false);
    setEditingCamera(null);
    setSelectedBrand(null);
    setSelectedModelId(null);
    setFormValues({
      catalogId: undefined,
      name: '',
      brand: '',
      model: '',
      sensorWidthMm: 0,
      sensorHeightMm: 0,
      resolutionX: 0,
      resolutionY: 0,
      pixelSizeUm: 0,
      sensorType: 'CMOS',
      notes: '',
    });
    setFormErrors({});
  };

  if (isLoading) {
    return <Text>Loading cameras...</Text>;
  }

  return (
    <Stack gap="md">
      <Group justify="between">
        <Text size="lg" className="font-medium">
          Your Cameras
        </Text>
        <Button onClick={() => setOpened(true)}>
          <IconPlus size={16} className="mr-2" />
          Add Camera
        </Button>
      </Group>

      {cameras && cameras.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Brand/Model</TableHead>
              <TableHead>Resolution</TableHead>
              <TableHead>Sensor Size</TableHead>
              <TableHead>Pixel Size</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cameras.map((camera) => (
              <TableRow key={camera.id}>
                <TableCell>{camera.name}</TableCell>
                <TableCell>
                  {camera.brand && camera.model
                    ? `${camera.brand} ${camera.model}`
                    : camera.brand || camera.model || '-'}
                </TableCell>
                <TableCell>
                  {camera.resolutionX} x {camera.resolutionY}
                </TableCell>
                <TableCell>
                  {camera.sensorWidthMm.toFixed(1)} x {camera.sensorHeightMm.toFixed(1)}mm
                </TableCell>
                <TableCell>{camera.pixelSizeUm.toFixed(2)}µm</TableCell>
                <TableCell>{camera.sensorType}</TableCell>
                <TableCell>
                  <Group gap="xs">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(camera)}>
                      <IconEdit size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirm(camera.id)}
                    >
                      <IconTrash size={16} />
                    </Button>
                  </Group>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Alert icon={<IconCamera size={16} />} title="No cameras yet" color="blue">
          Add your first camera to start calculating field of views.
        </Alert>
      )}

      <Dialog open={opened} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCamera ? 'Edit Camera' : 'Add Camera'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              {!editingCamera && (
                <>
                  <Text size="sm" className="font-medium">
                    Select from Camera Catalog
                  </Text>
                  <SelectField
                    label="Brand"
                    placeholder="Select a brand"
                    data={brands.map((b) => ({ value: b, label: b }))}
                    value={selectedBrand || ''}
                    onChange={(value) => {
                      setSelectedBrand(value);
                      setSelectedModelId(null); // Reset model when brand changes
                    }}
                    disabled={brands.length === 0}
                  />
                  {selectedBrand && (
                    <SelectField
                      label="Model"
                      placeholder="Select a model"
                      data={models.map((c) => ({
                        value: c.id,
                        label: `${c.model} (${c.resolutionX}x${c.resolutionY}, ${c.pixelSizeUm.toFixed(2)}µm)`,
                      }))}
                      value={selectedModelId || ''}
                      onChange={setSelectedModelId}
                    />
                  )}
                  <Divider label="Or enter manually" labelPosition="center" />
                </>
              )}
              <TextInput
                label="Name"
                placeholder="My Camera"
                required
                value={formValues.name}
                onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                error={formErrors.name}
              />
              <Group className="grid grid-cols-2 gap-4">
                <TextInput
                  label="Brand"
                  placeholder="ZWO"
                  value={formValues.brand}
                  onChange={(e) => setFormValues({ ...formValues, brand: e.target.value })}
                />
                <TextInput
                  label="Model"
                  placeholder="ASI2600MC"
                  value={formValues.model}
                  onChange={(e) => setFormValues({ ...formValues, model: e.target.value })}
                />
              </Group>
              <Group className="grid grid-cols-2 gap-4">
                <NumberInput
                  label="Sensor Width (mm)"
                  placeholder="23.5"
                  min={0.1}
                  step={0.1}
                  precision={2}
                  required
                  value={formValues.sensorWidthMm}
                  onChange={(value) => setFormValues({ ...formValues, sensorWidthMm: value || 0 })}
                  error={formErrors.sensorWidthMm}
                />
                <NumberInput
                  label="Sensor Height (mm)"
                  placeholder="15.7"
                  min={0.1}
                  step={0.1}
                  precision={2}
                  required
                  value={formValues.sensorHeightMm}
                  onChange={(value) => setFormValues({ ...formValues, sensorHeightMm: value || 0 })}
                  error={formErrors.sensorHeightMm}
                />
              </Group>
              <Group className="grid grid-cols-2 gap-4">
                <NumberInput
                  label="Resolution X"
                  placeholder="6248"
                  min={1}
                  required
                  value={formValues.resolutionX}
                  onChange={(value) => setFormValues({ ...formValues, resolutionX: value || 0 })}
                  error={formErrors.resolutionX}
                />
                <NumberInput
                  label="Resolution Y"
                  placeholder="4176"
                  min={1}
                  required
                  value={formValues.resolutionY}
                  onChange={(value) => setFormValues({ ...formValues, resolutionY: value || 0 })}
                  error={formErrors.resolutionY}
                />
              </Group>
              <Group className="grid grid-cols-2 gap-4">
                <NumberInput
                  label="Pixel Size (µm)"
                  placeholder="3.76"
                  min={0.1}
                  step={0.01}
                  precision={2}
                  required
                  value={formValues.pixelSizeUm}
                  onChange={(value) => setFormValues({ ...formValues, pixelSizeUm: value || 0 })}
                  error={formErrors.pixelSizeUm}
                />
                <SelectField
                  label="Sensor Type"
                  data={[
                    { value: 'CMOS', label: 'CMOS' },
                    { value: 'CCD', label: 'CCD' },
                    { value: 'Mono', label: 'Mono' },
                    { value: 'Color', label: 'Color' },
                  ]}
                  value={formValues.sensorType}
                  onChange={(value) => setFormValues({ ...formValues, sensorType: value })}
                  required
                />
              </Group>
              <TextareaField
                label="Notes"
                placeholder="Additional information..."
                value={formValues.notes}
                onChange={(e) => setFormValues({ ...formValues, notes: e.target.value })}
              />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingCamera ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </Stack>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Camera</DialogTitle>
          </DialogHeader>
          <Stack gap="md">
            <Text>Are you sure you want to delete this camera? This action cannot be undone.</Text>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                disabled={deleteMutation.isPending}
              >
                Delete
              </Button>
            </DialogFooter>
          </Stack>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
