'use client';

import { useState, useMemo } from 'react';
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
  Divider,
  Loader,
  ScrollArea,
  Badge,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDebouncedValue } from '@mantine/hooks';
import { IconPlus, IconEdit, IconTrash, IconTelescope, IconSearch } from '@tabler/icons-react';
import {
  useTelescopes,
  useTelescopeCatalog,
  useCreateTelescope,
  useUpdateTelescope,
  useDeleteTelescope,
} from '@/hooks/useGear';
import type { Telescope, CreateTelescopeInput, TelescopeCatalog } from '@/types';

export function TelescopesTab(): JSX.Element {
  const [opened, setOpened] = useState(false);
  const [editingTelescope, setEditingTelescope] = useState<Telescope | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(catalogSearch, 300);

  const { data: telescopes, isLoading } = useTelescopes();
  const { data: catalogData, isLoading: isCatalogLoading } = useTelescopeCatalog(debouncedSearch, 50);
  const createMutation = useCreateTelescope();
  const updateMutation = useUpdateTelescope();
  const deleteMutation = useDeleteTelescope();

  const form = useForm<CreateTelescopeInput>({
    initialValues: {
      catalogId: undefined,
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

  const catalogTelescopes = useMemo(() => catalogData?.telescopes || [], [catalogData]);

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
    setCatalogSearch('');
    form.reset();
  };

  const handleSelectFromCatalog = (catalogTelescope: TelescopeCatalog): void => {
    form.setValues({
      catalogId: catalogTelescope.id,
      name: `${catalogTelescope.brand} ${catalogTelescope.model}`,
      brand: catalogTelescope.brand,
      model: catalogTelescope.model,
      focalLengthMm: catalogTelescope.focalLengthMm,
      apertureMm: catalogTelescope.apertureMm,
      focalRatio: catalogTelescope.focalRatio,
      notes: form.values.notes || '',
    });
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
        size="lg"
      >
        <Stack gap="md">
          {!editingTelescope && (
            <>
              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  Select from Catalog
                </Text>
                <TextInput
                  placeholder="Search by brand or model..."
                  leftSection={<IconSearch size={16} />}
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.currentTarget.value)}
                />
                <ScrollArea h={200} type="auto">
                  {isCatalogLoading ? (
                    <Group justify="center" p="md">
                      <Loader size="sm" />
                    </Group>
                  ) : catalogTelescopes.length > 0 ? (
                    <Stack gap={4}>
                      {catalogTelescopes.map((telescope) => (
                        <Button
                          key={telescope.id}
                          variant="subtle"
                          onClick={() => handleSelectFromCatalog(telescope)}
                          styles={{
                            root: {
                              height: 'auto',
                              padding: '8px 12px',
                            },
                            label: {
                              display: 'block',
                              textAlign: 'left',
                              whiteSpace: 'normal',
                            },
                          }}
                        >
                          <Group justify="space-between" w="100%" wrap="nowrap">
                            <Stack gap={0}>
                              <Text size="sm" fw={500}>
                                {telescope.brand} {telescope.model}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {telescope.apertureMm}mm f/{telescope.focalRatio.toFixed(1)}
                              </Text>
                            </Stack>
                            <Badge size="sm" variant="light">
                              {telescope.focalLengthMm}mm
                            </Badge>
                          </Group>
                        </Button>
                      ))}
                    </Stack>
                  ) : catalogSearch ? (
                    <Text size="sm" c="dimmed" ta="center" p="md">
                      No telescopes found matching &quot;{catalogSearch}&quot;
                    </Text>
                  ) : (
                    <Text size="sm" c="dimmed" ta="center" p="md">
                      Search for a telescope to get started
                    </Text>
                  )}
                </ScrollArea>
              </Stack>

              <Divider label="Or enter custom telescope details" labelPosition="center" />
            </>
          )}

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
        </Stack>
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
