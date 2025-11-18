'use client';

import { useState } from 'react';
import {
  Stack,
  Button,
  Table,
  Group,
  Text,
  Modal,
  TextInput,
  NumberInput,
  ActionIcon,
  Alert,
  Select,
  Card,
  Badge,
  Grid,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus, IconEdit, IconTrash, IconRocket } from '@tabler/icons-react';
import {
  useRigs,
  useCreateRig,
  useUpdateRig,
  useDeleteRig,
  useTelescopes,
  useCameras,
} from '@/hooks/useGear';
import type { Rig, CreateRigInput } from '@/types';

export function RigsTab(): JSX.Element {
  const [opened, setOpened] = useState(false);
  const [editingRig, setEditingRig] = useState<Rig | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: rigs, isLoading } = useRigs();
  const { data: telescopes } = useTelescopes();
  const { data: cameras } = useCameras();
  const createMutation = useCreateRig();
  const updateMutation = useUpdateRig();
  const deleteMutation = useDeleteRig();

  const form = useForm<CreateRigInput>({
    initialValues: {
      name: '',
      telescopeId: '',
      cameraId: '',
      reducerFactor: 1.0,
      barlowFactor: 1.0,
      rotationDegDefault: 0,
    },
    validate: {
      name: (value) => (!value ? 'Name is required' : null),
      telescopeId: (value) => (!value ? 'Telescope is required' : null),
      cameraId: (value) => (!value ? 'Camera is required' : null),
    },
  });

  const handleSubmit = async (values: CreateRigInput): Promise<void> => {
    try {
      if (editingRig) {
        await updateMutation.mutateAsync({ id: editingRig.id, data: values });
      } else {
        await createMutation.mutateAsync(values);
      }
      setOpened(false);
      setEditingRig(null);
      form.reset();
    } catch (error) {
      console.error('Failed to save rig:', error);
    }
  };

  const handleEdit = (rig: Rig): void => {
    setEditingRig(rig);
    form.setValues({
      name: rig.name,
      telescopeId: rig.telescopeId,
      cameraId: rig.cameraId,
      reducerFactor: rig.reducerFactor || 1.0,
      barlowFactor: rig.barlowFactor || 1.0,
      rotationDegDefault: rig.rotationDegDefault || 0,
    });
    setOpened(true);
  };

  const handleDelete = async (id: string): Promise<void> => {
    try {
      await deleteMutation.mutateAsync(id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete rig:', error);
    }
  };

  const handleClose = (): void => {
    setOpened(false);
    setEditingRig(null);
    form.reset();
  };

  if (isLoading) {
    return <Text>Loading rigs...</Text>;
  }

  const telescopeOptions =
    telescopes?.map((t) => ({ value: t.id, label: t.name })) || [];
  const cameraOptions = cameras?.map((c) => ({ value: c.id, label: c.name })) || [];

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text size="lg" fw={500}>
          Your Rigs
        </Text>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setOpened(true)}
          disabled={!telescopes?.length || !cameras?.length}
        >
          Add Rig
        </Button>
      </Group>

      {!telescopes?.length || !cameras?.length ? (
        <Alert icon={<IconRocket size={16} />} title="Add equipment first" color="yellow">
          You need at least one telescope and one camera to create a rig.
        </Alert>
      ) : rigs && rigs.length > 0 ? (
        <Grid>
          {rigs.map((rig) => (
            <Grid.Col key={rig.id} span={{ base: 12, md: 6 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group justify="space-between" mb="xs">
                  <Text fw={500} size="lg">
                    {rig.name}
                  </Text>
                  <Group gap="xs">
                    <ActionIcon variant="subtle" color="blue" onClick={() => handleEdit(rig)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => setDeleteConfirm(rig.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>

                <Stack gap="xs">
                  <Text size="sm" c="dimmed">
                    <strong>Telescope:</strong> {rig.telescope.name}
                  </Text>
                  <Text size="sm" c="dimmed">
                    <strong>Camera:</strong> {rig.camera.name}
                  </Text>

                  {(rig.reducerFactor !== 1.0 || rig.barlowFactor !== 1.0) && (
                    <Group gap="xs">
                      {rig.reducerFactor !== 1.0 && (
                        <Badge color="blue" size="sm">
                          {rig.reducerFactor}x Reducer
                        </Badge>
                      )}
                      {rig.barlowFactor !== 1.0 && (
                        <Badge color="orange" size="sm">
                          {rig.barlowFactor}x Barlow
                        </Badge>
                      )}
                    </Group>
                  )}

                  <Card mt="md" padding="sm" bg="dark.6" radius="sm">
                    <Text size="sm" fw={500} mb="xs" c="dimmed">
                      Field of View
                    </Text>
                    <Stack gap={4}>
                      <Text size="sm">
                        <strong>Width:</strong> {rig.fovWidthArcmin.toFixed(2)}′
                        ({(rig.fovWidthArcmin / 60).toFixed(2)}°)
                      </Text>
                      <Text size="sm">
                        <strong>Height:</strong> {rig.fovHeightArcmin.toFixed(2)}′
                        ({(rig.fovHeightArcmin / 60).toFixed(2)}°)
                      </Text>
                      <Text size="sm">
                        <strong>Pixel Scale:</strong> {rig.pixelScale.toFixed(2)}
                        ″/px
                      </Text>
                    </Stack>
                  </Card>
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      ) : (
        <Alert icon={<IconRocket size={16} />} title="No rigs yet" color="blue">
          Create your first rig to calculate field of views and start planning.
        </Alert>
      )}

      <Modal
        opened={opened}
        onClose={handleClose}
        title={editingRig ? 'Edit Rig' : 'Add Rig'}
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Name"
              placeholder="My Imaging Rig"
              required
              {...form.getInputProps('name')}
            />

            <Select
              label="Telescope"
              placeholder="Select telescope"
              data={telescopeOptions}
              required
              searchable
              {...form.getInputProps('telescopeId')}
            />

            <Select
              label="Camera"
              placeholder="Select camera"
              data={cameraOptions}
              required
              searchable
              {...form.getInputProps('cameraId')}
            />

            <Group grow>
              <NumberInput
                label="Focal Reducer"
                placeholder="1.0"
                min={0.1}
                max={1.0}
                step={0.1}
                decimalScale={2}
                {...form.getInputProps('reducerFactor')}
              />
              <NumberInput
                label="Barlow Factor"
                placeholder="1.0"
                min={1.0}
                max={5.0}
                step={0.5}
                decimalScale={2}
                {...form.getInputProps('barlowFactor')}
              />
            </Group>

            <NumberInput
              label="Default Rotation (°)"
              placeholder="0"
              min={0}
              max={360}
              {...form.getInputProps('rotationDegDefault')}
            />

            <Group justify="flex-end">
              <Button variant="subtle" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingRig ? 'Update' : 'Create'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Rig"
        size="sm"
      >
        <Stack gap="md">
          <Text>Are you sure you want to delete this rig? This action cannot be undone.</Text>
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
