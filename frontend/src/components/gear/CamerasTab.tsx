'use client';

import { useState, useEffect } from 'react';
import {
  Stack,
  Button,
  Table,
  Group,
  Text,
  Modal,
  TextInput,
  NumberInput,
  Textarea,
  ActionIcon,
  Alert,
  Select,
  Divider,
} from '@mantine/core';
import { useForm } from '@mantine/form';
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

export function CamerasTab(): JSX.Element {
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

  const form = useForm<CreateCameraInput>({
    initialValues: {
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
    },
    validate: {
      name: (value) => (!value ? 'Name is required' : null),
      sensorWidthMm: (value) => (value <= 0 ? 'Sensor width must be positive' : null),
      sensorHeightMm: (value) => (value <= 0 ? 'Sensor height must be positive' : null),
      resolutionX: (value) => (value <= 0 ? 'Resolution X must be positive' : null),
      resolutionY: (value) => (value <= 0 ? 'Resolution Y must be positive' : null),
      pixelSizeUm: (value) => (value <= 0 ? 'Pixel size must be positive' : null),
    },
  });

  // Auto-fill form when camera model is selected from catalog
  useEffect(() => {
    if (selectedModelId) {
      const selectedCamera = models.find((c) => c.id === selectedModelId);
      if (selectedCamera) {
        form.setValues({
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
          notes: form.values.notes, // Preserve notes if any
        });
      }
    }
  }, [selectedModelId, models]);

  const handleSubmit = async (values: CreateCameraInput): Promise<void> => {
    try {
      if (editingCamera) {
        await updateMutation.mutateAsync({ id: editingCamera.id, data: values });
      } else {
        await createMutation.mutateAsync(values);
      }
      setOpened(false);
      setEditingCamera(null);
      form.reset();
    } catch (error) {
      console.error('Failed to save camera:', error);
    }
  };

  const handleEdit = (camera: Camera): void => {
    setEditingCamera(camera);
    form.setValues({
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
    form.reset();
  };

  if (isLoading) {
    return <Text>Loading cameras...</Text>;
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text size="lg" fw={500}>
          Your Cameras
        </Text>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setOpened(true)}>
          Add Camera
        </Button>
      </Group>

      {cameras && cameras.length > 0 ? (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Brand/Model</Table.Th>
              <Table.Th>Resolution</Table.Th>
              <Table.Th>Sensor Size</Table.Th>
              <Table.Th>Pixel Size</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {cameras.map((camera) => (
              <Table.Tr key={camera.id}>
                <Table.Td>{camera.name}</Table.Td>
                <Table.Td>
                  {camera.brand && camera.model
                    ? `${camera.brand} ${camera.model}`
                    : camera.brand || camera.model || '-'}
                </Table.Td>
                <Table.Td>
                  {camera.resolutionX} x {camera.resolutionY}
                </Table.Td>
                <Table.Td>
                  {camera.sensorWidthMm.toFixed(1)} x {camera.sensorHeightMm.toFixed(1)}mm
                </Table.Td>
                <Table.Td>{camera.pixelSizeUm.toFixed(2)}µm</Table.Td>
                <Table.Td>{camera.sensorType}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon variant="subtle" color="blue" onClick={() => handleEdit(camera)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => setDeleteConfirm(camera.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      ) : (
        <Alert icon={<IconCamera size={16} />} title="No cameras yet" color="blue">
          Add your first camera to start calculating field of views.
        </Alert>
      )}

      <Modal
        opened={opened}
        onClose={handleClose}
        title={editingCamera ? 'Edit Camera' : 'Add Camera'}
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            {!editingCamera && (
              <>
                <Text size="sm" fw={500}>
                  Select from Camera Catalog
                </Text>
                <Select
                  label="Brand"
                  placeholder="Select a brand"
                  data={brands}
                  value={selectedBrand}
                  onChange={(value) => {
                    setSelectedBrand(value);
                    setSelectedModelId(null); // Reset model when brand changes
                  }}
                  searchable
                  clearable
                  disabled={brands.length === 0}
                />
                {selectedBrand && (
                  <Select
                    label="Model"
                    placeholder="Select a model"
                    data={models.map((c) => ({
                      value: c.id,
                      label: `${c.model} (${c.resolutionX}x${c.resolutionY}, ${c.pixelSizeUm.toFixed(2)}µm)`,
                    }))}
                    value={selectedModelId}
                    onChange={setSelectedModelId}
                    searchable
                    clearable
                  />
                )}
                <Divider label="Or enter manually" labelPosition="center" />
              </>
            )}
            <TextInput label="Name" placeholder="My Camera" required {...form.getInputProps('name')} />
            <Group grow>
              <TextInput label="Brand" placeholder="ZWO" {...form.getInputProps('brand')} />
              <TextInput label="Model" placeholder="ASI2600MC" {...form.getInputProps('model')} />
            </Group>
            <Group grow>
              <NumberInput
                label="Sensor Width (mm)"
                placeholder="23.5"
                min={0.1}
                step={0.1}
                decimalScale={2}
                required
                {...form.getInputProps('sensorWidthMm')}
              />
              <NumberInput
                label="Sensor Height (mm)"
                placeholder="15.7"
                min={0.1}
                step={0.1}
                decimalScale={2}
                required
                {...form.getInputProps('sensorHeightMm')}
              />
            </Group>
            <Group grow>
              <NumberInput
                label="Resolution X"
                placeholder="6248"
                min={1}
                required
                {...form.getInputProps('resolutionX')}
              />
              <NumberInput
                label="Resolution Y"
                placeholder="4176"
                min={1}
                required
                {...form.getInputProps('resolutionY')}
              />
            </Group>
            <Group grow>
              <NumberInput
                label="Pixel Size (µm)"
                placeholder="3.76"
                min={0.1}
                step={0.01}
                decimalScale={2}
                required
                {...form.getInputProps('pixelSizeUm')}
              />
              <Select
                label="Sensor Type"
                data={['CMOS', 'CCD', 'Mono', 'Color']}
                required
                {...form.getInputProps('sensorType')}
              />
            </Group>
            <Textarea label="Notes" placeholder="Additional information..." {...form.getInputProps('notes')} />
            <Group justify="flex-end">
              <Button variant="subtle" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingCamera ? 'Update' : 'Create'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Camera"
        size="sm"
      >
        <Stack gap="md">
          <Text>Are you sure you want to delete this camera? This action cannot be undone.</Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              loading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
