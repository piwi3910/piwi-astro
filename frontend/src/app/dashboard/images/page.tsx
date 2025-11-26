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
  NumberInput,
  Grid,
  SimpleGrid,
  Loader,
  Switch,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IconEdit,
  IconTrash,
  IconUpload,
  IconEye,
  IconStar,
} from '@tabler/icons-react';
import Link from 'next/link';

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

async function fetchImages(): Promise<ImageUpload[]> {
  const response = await fetch('/api/images');
  if (!response.ok) throw new Error('Failed to fetch images');
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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<ImageUpload | null>(null);

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
          <Link href="/dashboard/images/upload">
            <Button leftSection={<IconUpload size={16} />}>Upload Image</Button>
          </Link>
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
