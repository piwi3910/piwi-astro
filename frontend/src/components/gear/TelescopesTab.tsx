'use client';

import { useState, useMemo, useEffect } from 'react';
import { IconPlus, IconEdit, IconTrash, IconTelescope } from '@tabler/icons-react';
import {
  useTelescopes,
  useTelescopeBrands,
  useTelescopesByBrand,
  useCreateTelescope,
  useUpdateTelescope,
  useDeleteTelescope,
} from '@/hooks/useGear';
import type { Telescope, CreateTelescopeInput } from '@/types';
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

export function TelescopesTab() {
  const [opened, setOpened] = useState(false);
  const [editingTelescope, setEditingTelescope] = useState<Telescope | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const { data: telescopes, isLoading } = useTelescopes();
  const { data: brandsData } = useTelescopeBrands();
  const { data: modelsData } = useTelescopesByBrand(selectedBrand);
  const createMutation = useCreateTelescope();
  const updateMutation = useUpdateTelescope();
  const deleteMutation = useDeleteTelescope();

  // Form state
  const [formValues, setFormValues] = useState<CreateTelescopeInput>({
    catalogId: undefined,
    name: '',
    brand: '',
    model: '',
    focalLengthMm: 0,
    apertureMm: 0,
    focalRatio: undefined,
    notes: '',
  });

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CreateTelescopeInput, string>>>({});

  const brands = useMemo(() => brandsData?.brands || [], [brandsData]);
  const models = useMemo(() => modelsData?.telescopes || [], [modelsData]);

  // When model is selected, auto-fill form
  useEffect(() => {
    if (selectedModelId) {
      const selectedTelescope = models.find((t) => t.id === selectedModelId);
      if (selectedTelescope) {
        setFormValues({
          catalogId: selectedTelescope.id,
          name: `${selectedTelescope.brand} ${selectedTelescope.model}`,
          brand: selectedTelescope.brand,
          model: selectedTelescope.model,
          focalLengthMm: selectedTelescope.focalLengthMm,
          apertureMm: selectedTelescope.apertureMm,
          focalRatio: selectedTelescope.focalRatio,
          notes: formValues.notes || '',
        });
      }
    }
  }, [selectedModelId, models]);

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof CreateTelescopeInput, string>> = {};

    if (!formValues.name) {
      errors.name = 'Name is required';
    }
    if (formValues.focalLengthMm <= 0) {
      errors.focalLengthMm = 'Focal length must be positive';
    }
    if (formValues.apertureMm <= 0) {
      errors.apertureMm = 'Aperture must be positive';
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
      if (editingTelescope) {
        await updateMutation.mutateAsync({ id: editingTelescope.id, data: formValues });
      } else {
        await createMutation.mutateAsync(formValues);
      }
      handleClose();
    } catch (error) {
      console.error('Failed to save telescope:', error);
    }
  };

  const handleEdit = (telescope: Telescope): void => {
    setEditingTelescope(telescope);
    setFormValues({
      name: telescope.name,
      brand: telescope.brand || '',
      model: telescope.model || '',
      focalLengthMm: telescope.focalLengthMm,
      apertureMm: telescope.apertureMm,
      focalRatio: telescope.focalRatio || undefined,
      notes: telescope.notes || '',
    });
    setFormErrors({});
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
    setSelectedBrand(null);
    setSelectedModelId(null);
    setFormValues({
      catalogId: undefined,
      name: '',
      brand: '',
      model: '',
      focalLengthMm: 0,
      apertureMm: 0,
      focalRatio: undefined,
      notes: '',
    });
    setFormErrors({});
  };

  if (isLoading) {
    return <Text>Loading telescopes...</Text>;
  }

  return (
    <Stack gap="md">
      <Group justify="between">
        <Text size="lg" className="font-medium">
          Your Telescopes
        </Text>
        <Button onClick={() => setOpened(true)}>
          <IconPlus size={16} className="mr-2" />
          Add Telescope
        </Button>
      </Group>

      {telescopes && telescopes.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Brand/Model</TableHead>
              <TableHead>Focal Length</TableHead>
              <TableHead>Aperture</TableHead>
              <TableHead>F-Ratio</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {telescopes.map((telescope) => (
              <TableRow key={telescope.id}>
                <TableCell>{telescope.name}</TableCell>
                <TableCell>
                  {telescope.brand && telescope.model
                    ? `${telescope.brand} ${telescope.model}`
                    : telescope.brand || telescope.model || '-'}
                </TableCell>
                <TableCell>{telescope.focalLengthMm}mm</TableCell>
                <TableCell>{telescope.apertureMm}mm</TableCell>
                <TableCell>
                  {telescope.focalRatio
                    ? `f/${telescope.focalRatio.toFixed(1)}`
                    : `f/${(telescope.focalLengthMm / telescope.apertureMm).toFixed(1)}`}
                </TableCell>
                <TableCell>
                  <Group gap="xs">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(telescope)}
                    >
                      <IconEdit size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirm(telescope.id)}
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
        <Alert icon={<IconTelescope size={16} />} title="No telescopes yet" color="blue">
          Add your first telescope to start planning your astrophotography sessions.
        </Alert>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={opened} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTelescope ? 'Edit Telescope' : 'Add Telescope'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              {!editingTelescope && (
                <>
                  <Stack gap="xs">
                    <Text size="sm" className="font-medium">
                      Select from Catalog
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
                    />

                    {selectedBrand && (
                      <SelectField
                        label="Model"
                        placeholder="Select a model"
                        data={models.map((t) => ({
                          value: t.id,
                          label: `${t.model} (${t.apertureMm}mm f/${t.focalRatio.toFixed(1)} - ${t.focalLengthMm}mm)`,
                        }))}
                        value={selectedModelId || ''}
                        onChange={setSelectedModelId}
                      />
                    )}
                  </Stack>

                  <Divider label="Or enter custom telescope details" labelPosition="center" />
                </>
              )}

              <TextInput
                label="Name"
                placeholder="My Telescope"
                required
                value={formValues.name}
                onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                error={formErrors.name}
              />

              <Group className="grid grid-cols-2 gap-4">
                <TextInput
                  label="Brand"
                  placeholder="Celestron"
                  value={formValues.brand}
                  onChange={(e) => setFormValues({ ...formValues, brand: e.target.value })}
                />
                <TextInput
                  label="Model"
                  placeholder="C8"
                  value={formValues.model}
                  onChange={(e) => setFormValues({ ...formValues, model: e.target.value })}
                />
              </Group>

              <Group className="grid grid-cols-2 gap-4">
                <NumberInput
                  label="Focal Length (mm)"
                  placeholder="2000"
                  min={1}
                  required
                  value={formValues.focalLengthMm}
                  onChange={(value) => setFormValues({ ...formValues, focalLengthMm: value || 0 })}
                  error={formErrors.focalLengthMm}
                />
                <NumberInput
                  label="Aperture (mm)"
                  placeholder="203"
                  min={1}
                  required
                  value={formValues.apertureMm}
                  onChange={(value) => setFormValues({ ...formValues, apertureMm: value || 0 })}
                  error={formErrors.apertureMm}
                />
              </Group>

              <NumberInput
                label="F-Ratio (optional)"
                placeholder="Auto-calculated if not provided"
                min={0.1}
                step={0.1}
                precision={2}
                value={formValues.focalRatio || ''}
                onChange={(value) => setFormValues({ ...formValues, focalRatio: value })}
              />

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
                  {editingTelescope ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </Stack>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Telescope</DialogTitle>
          </DialogHeader>
          <Stack gap="md">
            <Text>Are you sure you want to delete this telescope? This action cannot be undone.</Text>
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
