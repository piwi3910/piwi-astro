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
  Textarea,
  ActionIcon,
  Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus, IconEdit, IconTrash, IconTelescope } from '@tabler/icons-react';
import {
  useTelescopes,
  useCreateTelescope,
  useUpdateTelescope,
  useDeleteTelescope,
} from '@/hooks/useGear';
import type { Telescope, CreateTelescopeInput } from '@/types';

export function TelescopesTab(): JSX.Element {
  const [opened, setOpened] = useState(false);
  const [editingTelescope, setEditingTelescope] = useState<Telescope | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: telescopes, isLoading } = useTelescopes();
  const createMutation = useCreateTelescope();
  const updateMutation = useUpdateTelescope();
  const deleteMutation = useDeleteTelescope();

  const form = useForm<CreateTelescopeInput>({
    initialValues: {
      name: '',
      brand: '',
      model: '',
      focalLengthMm: 0,
      apertureMm: 0,
      focalRatio: undefined,
      notes: '',
    },
    validate: {
      name: (value) => (!value ? 'Name is required' : null),
      focalLengthMm: (value) => (value <= 0 ? 'Focal length must be positive' : null),
      apertureMm: (value) => (value <= 0 ? 'Aperture must be positive' : null),
    },
  });

  const handleSubmit = async (values: CreateTelescopeInput): Promise<void> => {
    try {
      if (editingTelescope) {
        await updateMutation.mutateAsync({ id: editingTelescope.id, data: values });
      } else {
        await createMutation.mutateAsync(values);
      }
      setOpened(false);
      setEditingTelescope(null);
      form.reset();
    } catch (error) {
      console.error('Failed to save telescope:', error);
    }
  };

  const handleEdit = (telescope: Telescope): void => {
    setEditingTelescope(telescope);
    form.setValues({
      name: telescope.name,
      brand: telescope.brand || '',
      model: telescope.model || '',
      focalLengthMm: telescope.focalLengthMm,
      apertureMm: telescope.apertureMm,
      focalRatio: telescope.focalRatio || undefined,
      notes: telescope.notes || '',
    });
    setOpened(true);
  };

  const handleDelete = async (id: string): Promise<void> => {
    try {
      await deleteMutation.mutateAsync(id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete telescope:', error);
    }
  };

  const handleClose = (): void => {
    setOpened(false);
    setEditingTelescope(null);
    form.reset();
  };

  if (isLoading) {
    return <Text>Loading telescopes...</Text>;
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text size="lg" fw={500}>
          Your Telescopes
        </Text>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setOpened(true)}>
          Add Telescope
        </Button>
      </Group>

      {telescopes && telescopes.length > 0 ? (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Brand/Model</Table.Th>
              <Table.Th>Focal Length</Table.Th>
              <Table.Th>Aperture</Table.Th>
              <Table.Th>F-Ratio</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {telescopes.map((telescope) => (
              <Table.Tr key={telescope.id}>
                <Table.Td>{telescope.name}</Table.Td>
                <Table.Td>
                  {telescope.brand && telescope.model
                    ? `${telescope.brand} ${telescope.model}`
                    : telescope.brand || telescope.model || '-'}
                </Table.Td>
                <Table.Td>{telescope.focalLengthMm}mm</Table.Td>
                <Table.Td>{telescope.apertureMm}mm</Table.Td>
                <Table.Td>
                  {telescope.focalRatio
                    ? `f/${telescope.focalRatio.toFixed(1)}`
                    : `f/${(telescope.focalLengthMm / telescope.apertureMm).toFixed(1)}`}
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      onClick={() => handleEdit(telescope)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => setDeleteConfirm(telescope.id)}
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
        <Alert icon={<IconTelescope size={16} />} title="No telescopes yet" color="blue">
          Add your first telescope to start planning your astrophotography sessions.
        </Alert>
      )}

      {/* Add/Edit Modal */}
      <Modal
        opened={opened}
        onClose={handleClose}
        title={editingTelescope ? 'Edit Telescope' : 'Add Telescope'}
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Name"
              placeholder="My Telescope"
              required
              {...form.getInputProps('name')}
            />

            <Group grow>
              <TextInput label="Brand" placeholder="Celestron" {...form.getInputProps('brand')} />
              <TextInput label="Model" placeholder="C8" {...form.getInputProps('model')} />
            </Group>

            <Group grow>
              <NumberInput
                label="Focal Length (mm)"
                placeholder="2000"
                min={1}
                required
                {...form.getInputProps('focalLengthMm')}
              />
              <NumberInput
                label="Aperture (mm)"
                placeholder="203"
                min={1}
                required
                {...form.getInputProps('apertureMm')}
              />
            </Group>

            <NumberInput
              label="F-Ratio (optional)"
              placeholder="Auto-calculated if not provided"
              min={0.1}
              step={0.1}
              decimalScale={2}
              {...form.getInputProps('focalRatio')}
            />

            <Textarea
              label="Notes"
              placeholder="Additional information..."
              {...form.getInputProps('notes')}
            />

            <Group justify="flex-end">
              <Button variant="subtle" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingTelescope ? 'Update' : 'Create'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Telescope"
        size="sm"
      >
        <Stack gap="md">
          <Text>Are you sure you want to delete this telescope? This action cannot be undone.</Text>
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
