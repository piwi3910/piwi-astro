'use client';

import { useState } from 'react';
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
import { PixelScaleGauge } from './PixelScaleGauge';
import { FilterSizeIndicator } from './FilterSizeIndicator';
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
import { Grid, GridCol } from '@/components/ui/grid';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TextInput } from '@/components/ui/text-input';
import { NumberInput } from '@/components/ui/number-input';
import { SelectField } from '@/components/ui/select-field';
import { Alert } from '@/components/ui/alert';

export function RigsTab() {
  const [opened, setOpened] = useState(false);
  const [editingRig, setEditingRig] = useState<Rig | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: rigs, isLoading } = useRigs();
  const { data: telescopes } = useTelescopes();
  const { data: cameras } = useCameras();
  const createMutation = useCreateRig();
  const updateMutation = useUpdateRig();
  const deleteMutation = useDeleteRig();

  // Form state
  const [formValues, setFormValues] = useState<CreateRigInput>({
    name: '',
    telescopeId: '',
    cameraId: '',
    reducerFactor: 1.0,
    barlowFactor: 1.0,
    rotationDegDefault: 0,
  });

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CreateRigInput, string>>>({});

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof CreateRigInput, string>> = {};

    if (!formValues.name) {
      errors.name = 'Name is required';
    }
    if (!formValues.telescopeId) {
      errors.telescopeId = 'Telescope is required';
    }
    if (!formValues.cameraId) {
      errors.cameraId = 'Camera is required';
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
      if (editingRig) {
        await updateMutation.mutateAsync({ id: editingRig.id, data: formValues });
      } else {
        await createMutation.mutateAsync(formValues);
      }
      handleClose();
    } catch (error) {
      console.error('Failed to save rig:', error);
    }
  };

  const handleEdit = (rig: Rig): void => {
    setEditingRig(rig);
    setFormValues({
      name: rig.name,
      telescopeId: rig.telescopeId,
      cameraId: rig.cameraId,
      reducerFactor: rig.reducerFactor || 1.0,
      barlowFactor: rig.barlowFactor || 1.0,
      rotationDegDefault: rig.rotationDegDefault || 0,
    });
    setFormErrors({});
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
    setFormValues({
      name: '',
      telescopeId: '',
      cameraId: '',
      reducerFactor: 1.0,
      barlowFactor: 1.0,
      rotationDegDefault: 0,
    });
    setFormErrors({});
  };

  if (isLoading) {
    return <Text>Loading rigs...</Text>;
  }

  const telescopeOptions =
    telescopes?.map((t) => ({ value: t.id, label: t.name })) || [];
  const cameraOptions = cameras?.map((c) => ({ value: c.id, label: c.name })) || [];

  return (
    <Stack gap="md">
      <Group justify="between">
        <Text size="lg" className="font-medium">
          Your Rigs
        </Text>
        <Button
          onClick={() => setOpened(true)}
          disabled={!telescopes?.length || !cameras?.length}
        >
          <IconPlus size={16} className="mr-2" />
          Add Rig
        </Button>
      </Group>

      {!telescopes?.length || !cameras?.length ? (
        <Alert icon={<IconRocket size={16} />} title="Add equipment first" color="yellow">
          You need at least one telescope and one camera to create a rig.
        </Alert>
      ) : rigs && rigs.length > 0 ? (
        <Grid cols={12} gutter="md">
          {rigs.map((rig) => (
            <GridCol key={rig.id} span={{ base: 12, md: 6 }}>
              <Card className="shadow-sm border">
                <CardContent className="p-6">
                  <Group justify="between" className="mb-4">
                    <Text className="font-medium text-lg">
                      {rig.name}
                    </Text>
                    <Group gap="xs">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(rig)}>
                        <IconEdit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirm(rig.id)}
                      >
                        <IconTrash size={16} />
                      </Button>
                    </Group>
                  </Group>

                  <Group className="items-start gap-4">
                    <Stack gap="xs" className="flex-1">
                      <Text size="sm" className="text-muted-foreground">
                        <strong>Telescope:</strong> {rig.telescope.name}
                      </Text>
                      <Text size="sm" className="text-muted-foreground">
                        <strong>Camera:</strong> {rig.camera.name}
                      </Text>

                      {(rig.reducerFactor !== 1.0 || rig.barlowFactor !== 1.0) && (
                        <Group gap="xs">
                          {rig.reducerFactor !== 1.0 && (
                            <Badge variant="secondary" className="bg-blue-950/50 text-blue-300">
                              {rig.reducerFactor}x Reducer
                            </Badge>
                          )}
                          {rig.barlowFactor !== 1.0 && (
                            <Badge variant="secondary" className="bg-orange-950/50 text-orange-300">
                              {rig.barlowFactor}x Barlow
                            </Badge>
                          )}
                        </Group>
                      )}

                      <Card className="mt-4 bg-card/50 border-border/50">
                        <CardContent className="p-3">
                          <Text size="sm" className="font-medium mb-2 text-muted-foreground">
                            Field of View
                          </Text>
                          <Stack gap="xs">
                            <Text size="sm">
                              <strong>Width:</strong> {(rig.fovWidthArcmin ?? rig.fov.fovWidthArcmin).toFixed(2)}′
                              ({((rig.fovWidthArcmin ?? rig.fov.fovWidthArcmin) / 60).toFixed(2)}°)
                            </Text>
                            <Text size="sm">
                              <strong>Height:</strong> {(rig.fovHeightArcmin ?? rig.fov.fovHeightArcmin).toFixed(2)}′
                              ({((rig.fovHeightArcmin ?? rig.fov.fovHeightArcmin) / 60).toFixed(2)}°)
                            </Text>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Stack>

                    <Group gap="lg" className="items-start pt-1">
                      <FilterSizeIndicator
                        sensorWidthMm={rig.camera.sensorWidthMm}
                        sensorHeightMm={rig.camera.sensorHeightMm}
                      />
                      <PixelScaleGauge pixelScale={rig.pixelScale ?? rig.fov.pixelScaleArcsecPerPixel} />
                    </Group>
                  </Group>
                </CardContent>
              </Card>
            </GridCol>
          ))}
        </Grid>
      ) : (
        <Alert icon={<IconRocket size={16} />} title="No rigs yet" color="blue">
          Create your first rig to calculate field of views and start planning.
        </Alert>
      )}

      <Dialog open={opened} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRig ? 'Edit Rig' : 'Add Rig'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                label="Name"
                placeholder="My Imaging Rig"
                required
                value={formValues.name}
                onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                error={formErrors.name}
              />

              <SelectField
                label="Telescope"
                placeholder="Select telescope"
                data={telescopeOptions}
                value={formValues.telescopeId}
                onChange={(value) => setFormValues({ ...formValues, telescopeId: value })}
                required
                error={formErrors.telescopeId}
              />

              <SelectField
                label="Camera"
                placeholder="Select camera"
                data={cameraOptions}
                value={formValues.cameraId}
                onChange={(value) => setFormValues({ ...formValues, cameraId: value })}
                required
                error={formErrors.cameraId}
              />

              <Group className="grid grid-cols-2 gap-4">
                <NumberInput
                  label="Focal Reducer"
                  placeholder="1.0"
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  precision={2}
                  value={formValues.reducerFactor}
                  onChange={(value) => setFormValues({ ...formValues, reducerFactor: value || 1.0 })}
                />
                <NumberInput
                  label="Barlow Factor"
                  placeholder="1.0"
                  min={1.0}
                  max={5.0}
                  step={0.5}
                  precision={2}
                  value={formValues.barlowFactor}
                  onChange={(value) => setFormValues({ ...formValues, barlowFactor: value || 1.0 })}
                />
              </Group>

              <NumberInput
                label="Default Rotation (°)"
                placeholder="0"
                min={0}
                max={360}
                value={formValues.rotationDegDefault}
                onChange={(value) => setFormValues({ ...formValues, rotationDegDefault: value || 0 })}
              />

              <DialogFooter>
                <Button variant="outline" type="button" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingRig ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </Stack>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Rig</DialogTitle>
          </DialogHeader>
          <Stack gap="md">
            <Text>Are you sure you want to delete this rig? This action cannot be undone.</Text>
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
