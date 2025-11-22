'use client';

import { useState } from 'react';
import {
  Container,
  Title,
  Button,
  Stack,
  Group,
  Card,
  Text,
  Image,
  Badge,
  ActionIcon,
  Modal,
  TextInput,
  Textarea,
  Select,
  FileInput,
  NumberInput,
  Grid,
  SimpleGrid,
  Loader,
  Switch,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconUpload,
  IconEye,
  IconStar,
} from '@tabler/icons-react';

interface Target {
  catalogId: string | null;
  name: string;
  type: string;
}

interface ImageUpload {
  id: string;
  filename: string;
  s3Key: string;
  url: string;
  fileSize: number;
  mimeType: string;
  visibility: string;
  title: string | null;
  description: string | null;
  featured: boolean;
  viewCount: number;
  captureDate: string | null;
  exposureTime: number | null;
  exposureCount: number | null;
  iso: number | null;
  focalLength: number | null;
  aperture: number | null;
  target: Target;
}

interface UserTarget {
  id: string;
  targetId: string;
  target: Target;
}

interface Session {
  id: string;
  date: string;
  location: string;
}

interface Rig {
  id: string;
  name: string;
}

async function fetchImages(): Promise<ImageUpload[]> {
  const response = await fetch('/api/images');
  if (!response.ok) throw new Error('Failed to fetch images');
  return response.json();
}

async function fetchUserTargets(): Promise<UserTarget[]> {
  const response = await fetch('/api/user-targets');
  if (!response.ok) throw new Error('Failed to fetch targets');
  return response.json();
}

async function fetchSessions(): Promise<Session[]> {
  const response = await fetch('/api/sessions');
  if (!response.ok) throw new Error('Failed to fetch sessions');
  return response.json();
}

async function fetchRigs(): Promise<Rig[]> {
  const response = await fetch('/api/rigs');
  if (!response.ok) throw new Error('Failed to fetch rigs');
  return response.json();
}

async function uploadImage(formData: FormData): Promise<ImageUpload> {
  const response = await fetch('/api/images', {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error('Failed to upload image');
  return response.json();
}

async function updateImage(id: string, data: Partial<ImageUpload>): Promise<ImageUpload> {
  const response = await fetch(`/api/images/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update image');
  return response.json();
}

async function deleteImage(id: string): Promise<void> {
  const response = await fetch(`/api/images/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete image');
}

export default function ImagesPage(): JSX.Element {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<ImageUpload | null>(null);

  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    targetId: '',
    sessionId: '',
    rigId: '',
    visibility: 'PRIVATE',
    title: '',
    description: '',
    captureDate: null as Date | null,
    exposureTime: 0,
    exposureCount: 0,
    iso: 0,
    focalLength: 0,
    aperture: 0,
  });

  const [extractingMetadata, setExtractingMetadata] = useState(false);
  const [extractedMetadata, setExtractedMetadata] = useState<any>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    visibility: 'PRIVATE',
    title: '',
    description: '',
    featured: false,
    captureDate: null as Date | null,
    exposureTime: 0,
    exposureCount: 0,
    iso: 0,
    focalLength: 0,
    aperture: 0,
  });

  const queryClient = useQueryClient();

  const { data: images, isLoading } = useQuery({
    queryKey: ['images'],
    queryFn: fetchImages,
  });

  const { data: userTargets } = useQuery({
    queryKey: ['user-targets'],
    queryFn: fetchUserTargets,
  });

  const { data: sessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: fetchSessions,
  });

  const { data: rigs } = useQuery({
    queryKey: ['rigs'],
    queryFn: fetchRigs,
  });

  const uploadMutation = useMutation({
    mutationFn: uploadImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['images'] });
      setUploadModalOpen(false);
      resetUploadForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ImageUpload> }) =>
      updateImage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['images'] });
      setEditModalOpen(false);
      setEditingImage(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['images'] });
    },
  });

  const resetUploadForm = (): void => {
    setUploadForm({
      file: null,
      targetId: '',
      sessionId: '',
      rigId: '',
      visibility: 'PRIVATE',
      title: '',
      description: '',
      captureDate: null,
      exposureTime: 0,
      exposureCount: 0,
      iso: 0,
      focalLength: 0,
      aperture: 0,
    });
    setExtractedMetadata(null);
    setMetadataError(null);
  };

  const handleFileSelect = async (file: File | null): Promise<void> => {
    if (!file) {
      setUploadForm({ ...uploadForm, file: null });
      setExtractedMetadata(null);
      setMetadataError(null);
      return;
    }

    setUploadForm({ ...uploadForm, file });
    setExtractingMetadata(true);
    setMetadataError(null);

    try {
      // Call metadata extraction API
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/images/extract-metadata', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract metadata');
      }

      const metadata = await response.json();
      setExtractedMetadata(metadata);

      // Auto-populate form fields from extracted metadata
      const updates: any = {};

      if (metadata.targetName) {
        updates.title = metadata.targetName;
      }

      if (metadata.captureDate) {
        try {
          updates.captureDate = new Date(metadata.captureDate);
        } catch (e) {
          console.error('Invalid date format:', e);
        }
      }

      if (metadata.exposureTime) {
        updates.exposureTime = metadata.exposureTime;
      }

      if (metadata.exposureCount) {
        updates.exposureCount = metadata.exposureCount;
      }

      if (metadata.iso) {
        updates.iso = metadata.iso;
      } else if (metadata.gain) {
        // Use gain as ISO if ISO not present
        updates.iso = Math.round(metadata.gain);
      }

      if (metadata.focalLength) {
        updates.focalLength = metadata.focalLength;
      }

      if (metadata.aperture) {
        updates.aperture = metadata.aperture;
      }

      // Try to match target by name or coordinates
      if (metadata.targetName && userTargets) {
        const matchedTarget = userTargets.find(
          (ut) =>
            ut.target.name.toLowerCase() === metadata.targetName.toLowerCase() ||
            (ut.target.catalogId &&
              ut.target.catalogId.toLowerCase() === metadata.targetName.toLowerCase())
        );
        if (matchedTarget) {
          updates.targetId = matchedTarget.targetId;
        }
      }

      setUploadForm({ ...uploadForm, file, ...updates });
    } catch (error) {
      console.error('Error extracting metadata:', error);
      setMetadataError(error instanceof Error ? error.message : 'Failed to extract metadata');
    } finally {
      setExtractingMetadata(false);
    }
  };

  const handleUpload = (): void => {
    if (!uploadForm.file || !uploadForm.targetId) return;

    const formData = new FormData();
    formData.append('file', uploadForm.file);
    formData.append('targetId', uploadForm.targetId);
    if (uploadForm.sessionId) formData.append('sessionId', uploadForm.sessionId);
    if (uploadForm.rigId) formData.append('rigId', uploadForm.rigId);
    formData.append('visibility', uploadForm.visibility);
    if (uploadForm.title) formData.append('title', uploadForm.title);
    if (uploadForm.description) formData.append('description', uploadForm.description);
    if (uploadForm.captureDate)
      formData.append('captureDate', uploadForm.captureDate.toISOString());
    if (uploadForm.exposureTime) formData.append('exposureTime', uploadForm.exposureTime.toString());
    if (uploadForm.exposureCount)
      formData.append('exposureCount', uploadForm.exposureCount.toString());
    if (uploadForm.iso) formData.append('iso', uploadForm.iso.toString());
    if (uploadForm.focalLength) formData.append('focalLength', uploadForm.focalLength.toString());
    if (uploadForm.aperture) formData.append('aperture', uploadForm.aperture.toString());

    uploadMutation.mutate(formData);
  };

  const handleEdit = (image: ImageUpload): void => {
    setEditingImage(image);
    setEditForm({
      visibility: image.visibility,
      title: image.title || '',
      description: image.description || '',
      featured: image.featured,
      captureDate: image.captureDate ? new Date(image.captureDate) : null,
      exposureTime: image.exposureTime || 0,
      exposureCount: image.exposureCount || 0,
      iso: image.iso || 0,
      focalLength: image.focalLength || 0,
      aperture: image.aperture || 0,
    });
    setEditModalOpen(true);
  };

  const handleUpdate = (): void => {
    if (!editingImage) return;

    updateMutation.mutate({
      id: editingImage.id,
      data: {
        visibility: editForm.visibility as ImageUpload['visibility'],
        title: editForm.title || undefined,
        description: editForm.description || undefined,
        featured: editForm.featured,
        captureDate: editForm.captureDate?.toISOString(),
        exposureTime: editForm.exposureTime || undefined,
        exposureCount: editForm.exposureCount || undefined,
        iso: editForm.iso || undefined,
        focalLength: editForm.focalLength || undefined,
        aperture: editForm.aperture || undefined,
      },
    });
  };

  const getVisibilityColor = (visibility: string): string => {
    const colors: Record<string, string> = {
      PUBLIC: 'green',
      PRIVATE: 'gray',
      UNLISTED: 'yellow',
    };
    return colors[visibility] || 'gray';
  };

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center">
          <Loader />
          <Text>Loading images...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={1}>My Images</Title>
          <Button
            leftSection={<IconUpload size={16} />}
            onClick={() => setUploadModalOpen(true)}
          >
            Upload Image
          </Button>
        </Group>

        {images && images.length > 0 ? (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
            {images.map((image) => (
              <Card key={image.id} shadow="sm" padding="sm" withBorder>
                <Card.Section>
                  <Image
                    src={image.url}
                    height={200}
                    alt={image.title || image.filename}
                    fit="cover"
                  />
                </Card.Section>

                <Stack gap="xs" mt="sm">
                  <Group justify="space-between" align="flex-start">
                    <div style={{ flex: 1 }}>
                      <Text fw={600} size="sm" lineClamp={1}>
                        {image.title || image.target.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {image.target.catalogId || image.target.name}
                      </Text>
                    </div>
                    {image.featured && (
                      <IconStar size={16} fill="gold" color="gold" />
                    )}
                  </Group>

                  <Group gap="xs">
                    <Badge size="xs" color={getVisibilityColor(image.visibility)}>
                      {image.visibility}
                    </Badge>
                    {image.viewCount > 0 && (
                      <Group gap={4}>
                        <IconEye size={12} />
                        <Text size="xs">{image.viewCount}</Text>
                      </Group>
                    )}
                  </Group>

                  {image.description && (
                    <Text size="xs" c="dimmed" lineClamp={2}>
                      {image.description}
                    </Text>
                  )}

                  {(image.exposureTime || image.exposureCount) && (
                    <Text size="xs" c="dimmed">
                      {image.exposureCount && `${image.exposureCount}×`}
                      {image.exposureTime && `${image.exposureTime}s`}
                      {image.iso && ` • ISO ${image.iso}`}
                    </Text>
                  )}

                  <Group gap="xs" justify="flex-end">
                    <ActionIcon variant="subtle" onClick={() => handleEdit(image)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => deleteMutation.mutate(image.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        ) : (
          <Text c="dimmed" ta="center" py="xl">
            No images uploaded yet. Upload your first astrophotography image!
          </Text>
        )}

        {/* Upload Modal */}
        <Modal
          opened={uploadModalOpen}
          onClose={() => {
            setUploadModalOpen(false);
            resetUploadForm();
          }}
          title="Upload Image"
          size="lg"
        >
          <Stack gap="md">
            <FileInput
              label="FITS/XISF File"
              placeholder="Select FITS or XISF file"
              accept=".fits,.fit,.fts,.xisf"
              value={uploadForm.file}
              onChange={handleFileSelect}
              leftSection={<IconUpload size={16} />}
              description={
                extractingMetadata
                  ? 'Extracting metadata...'
                  : extractedMetadata
                  ? `Detected: ${extractedMetadata.targetName || 'Unknown target'} • ${extractedMetadata.fileType || ''}`
                  : 'Upload FITS (.fits, .fit, .fts) or XISF (.xisf) files only'
              }
              error={metadataError}
              disabled={extractingMetadata}
              required
            />

            {extractingMetadata && (
              <Group gap="xs">
                <Loader size="sm" />
                <Text size="sm" c="dimmed">
                  Analyzing file and extracting metadata...
                </Text>
              </Group>
            )}

            {extractedMetadata && (
              <Stack gap="xs">
                <Text size="sm" fw={500} c="teal">
                  ✓ Metadata extracted successfully
                </Text>
                <Text size="xs" c="dimmed">
                  Form fields have been auto-populated. Please review and adjust as needed.
                </Text>
                {extractedMetadata.ra && extractedMetadata.dec && (
                  <Text size="xs" c="dimmed">
                    Coordinates: RA {extractedMetadata.ra.toFixed(4)}°, Dec{' '}
                    {extractedMetadata.dec.toFixed(4)}°
                  </Text>
                )}
              </Stack>
            )}

            <Select
              label="Target"
              placeholder="Select target"
              data={
                userTargets?.map((ut) => ({
                  value: ut.targetId,
                  label: `${ut.target.name}${
                    ut.target.catalogId ? ` (${ut.target.catalogId})` : ''
                  }`,
                })) || []
              }
              value={uploadForm.targetId}
              onChange={(val) => setUploadForm({ ...uploadForm, targetId: val || '' })}
              searchable
              required
            />

            <Grid>
              <Grid.Col span={6}>
                <Select
                  label="Session"
                  placeholder="Optional"
                  data={
                    sessions?.map((s) => ({
                      value: s.id,
                      label: `${new Date(s.date).toLocaleDateString()} - ${s.location}`,
                    })) || []
                  }
                  value={uploadForm.sessionId}
                  onChange={(val) => setUploadForm({ ...uploadForm, sessionId: val || '' })}
                  clearable
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="Rig"
                  placeholder="Optional"
                  data={rigs?.map((r) => ({ value: r.id, label: r.name })) || []}
                  value={uploadForm.rigId}
                  onChange={(val) => setUploadForm({ ...uploadForm, rigId: val || '' })}
                  clearable
                />
              </Grid.Col>
            </Grid>

            <Select
              label="Visibility"
              data={[
                { value: 'PRIVATE', label: 'Private' },
                { value: 'PUBLIC', label: 'Public' },
                { value: 'UNLISTED', label: 'Unlisted' },
              ]}
              value={uploadForm.visibility}
              onChange={(val) =>
                setUploadForm({ ...uploadForm, visibility: val || 'PRIVATE' })
              }
            />

            <TextInput
              label="Title"
              placeholder="Optional title"
              value={uploadForm.title}
              onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
            />

            <Textarea
              label="Description"
              placeholder="Optional description"
              value={uploadForm.description}
              onChange={(e) =>
                setUploadForm({ ...uploadForm, description: e.target.value })
              }
              minRows={2}
            />

            <DateTimePicker
              label="Capture Date"
              placeholder="Optional"
              value={uploadForm.captureDate}
              onChange={(val) => setUploadForm({ ...uploadForm, captureDate: val })}
              clearable
            />

            <Grid>
              <Grid.Col span={6}>
                <NumberInput
                  label="Exposure Time (s)"
                  placeholder="Optional"
                  value={uploadForm.exposureTime}
                  onChange={(val) =>
                    setUploadForm({ ...uploadForm, exposureTime: Number(val) })
                  }
                  min={0}
                  step={0.1}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput
                  label="Exposure Count"
                  placeholder="Optional"
                  value={uploadForm.exposureCount}
                  onChange={(val) =>
                    setUploadForm({ ...uploadForm, exposureCount: Number(val) })
                  }
                  min={0}
                />
              </Grid.Col>
            </Grid>

            <Grid>
              <Grid.Col span={4}>
                <NumberInput
                  label="ISO"
                  placeholder="Optional"
                  value={uploadForm.iso}
                  onChange={(val) => setUploadForm({ ...uploadForm, iso: Number(val) })}
                  min={0}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <NumberInput
                  label="Focal Length (mm)"
                  placeholder="Optional"
                  value={uploadForm.focalLength}
                  onChange={(val) =>
                    setUploadForm({ ...uploadForm, focalLength: Number(val) })
                  }
                  min={0}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <NumberInput
                  label="Aperture (f/)"
                  placeholder="Optional"
                  value={uploadForm.aperture}
                  onChange={(val) =>
                    setUploadForm({ ...uploadForm, aperture: Number(val) })
                  }
                  min={0}
                  step={0.1}
                />
              </Grid.Col>
            </Grid>

            <Group justify="flex-end">
              <Button
                variant="subtle"
                onClick={() => {
                  setUploadModalOpen(false);
                  resetUploadForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                loading={uploadMutation.isPending}
                disabled={!uploadForm.file || !uploadForm.targetId}
              >
                Upload
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Edit Modal */}
        <Modal
          opened={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingImage(null);
          }}
          title="Edit Image"
          size="lg"
        >
          <Stack gap="md">
            <Select
              label="Visibility"
              data={[
                { value: 'PRIVATE', label: 'Private' },
                { value: 'PUBLIC', label: 'Public' },
                { value: 'UNLISTED', label: 'Unlisted' },
              ]}
              value={editForm.visibility}
              onChange={(val) =>
                setEditForm({ ...editForm, visibility: val || 'PRIVATE' })
              }
            />

            <Switch
              label="Featured Image"
              description="Display this image prominently in your profile"
              checked={editForm.featured}
              onChange={(e) =>
                setEditForm({ ...editForm, featured: e.currentTarget.checked })
              }
            />

            <TextInput
              label="Title"
              placeholder="Optional title"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            />

            <Textarea
              label="Description"
              placeholder="Optional description"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              minRows={3}
            />

            <DateTimePicker
              label="Capture Date"
              placeholder="Optional"
              value={editForm.captureDate}
              onChange={(val) => setEditForm({ ...editForm, captureDate: val })}
              clearable
            />

            <Grid>
              <Grid.Col span={6}>
                <NumberInput
                  label="Exposure Time (s)"
                  value={editForm.exposureTime}
                  onChange={(val) =>
                    setEditForm({ ...editForm, exposureTime: Number(val) })
                  }
                  min={0}
                  step={0.1}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput
                  label="Exposure Count"
                  value={editForm.exposureCount}
                  onChange={(val) =>
                    setEditForm({ ...editForm, exposureCount: Number(val) })
                  }
                  min={0}
                />
              </Grid.Col>
            </Grid>

            <Grid>
              <Grid.Col span={4}>
                <NumberInput
                  label="ISO"
                  value={editForm.iso}
                  onChange={(val) => setEditForm({ ...editForm, iso: Number(val) })}
                  min={0}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <NumberInput
                  label="Focal Length (mm)"
                  value={editForm.focalLength}
                  onChange={(val) =>
                    setEditForm({ ...editForm, focalLength: Number(val) })
                  }
                  min={0}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <NumberInput
                  label="Aperture (f/)"
                  value={editForm.aperture}
                  onChange={(val) =>
                    setEditForm({ ...editForm, aperture: Number(val) })
                  }
                  min={0}
                  step={0.1}
                />
              </Grid.Col>
            </Grid>

            <Group justify="flex-end">
              <Button
                variant="subtle"
                onClick={() => {
                  setEditModalOpen(false);
                  setEditingImage(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdate} loading={updateMutation.isPending}>
                Save
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}
