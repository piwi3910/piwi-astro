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
  SimpleGrid,
  Loader,
  Switch,
  Menu,
  Tooltip,
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IconEdit,
  IconTrash,
  IconUpload,
  IconEye,
  IconEyeOff,
  IconLink,
  IconStar,
  IconZoomIn,
  IconX,
  IconChevronDown,
  IconDownload,
} from '@tabler/icons-react';
import Link from 'next/link';

interface Target {
  id: string;
  catalogId: string | null;
  name: string;
  type: string;
}

async function fetchTargets(search: string): Promise<Target[]> {
  if (!search || search.length < 2) return [];
  const response = await fetch(`/api/targets?search=${encodeURIComponent(search)}&limit=20`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.targets || data;
}

interface ImageUpload {
  id: string;
  storageKey: string;
  url: string;
  visibility: string;
  title: string | null;
  description: string | null;
  featured: boolean;
  viewCount: number;
  exposureTimeSec: number | null;
  totalIntegrationMin: number | null;
  filter: string | null;
  isoGain: string | null;
  uploadedAt: string;
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
  const [lightboxImage, setLightboxImage] = useState<ImageUpload | null>(null);
  const [targetSearch, setTargetSearch] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    visibility: 'PRIVATE',
    title: '',
    description: '',
    featured: false,
  });

  const queryClient = useQueryClient();

  const { data: images, isLoading } = useQuery({
    queryKey: ['images'],
    queryFn: fetchImages,
  });

  const { data: searchedTargets } = useQuery({
    queryKey: ['targets-search', targetSearch],
    queryFn: () => fetchTargets(targetSearch),
    enabled: targetSearch.length >= 2,
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
    });
    // Set current target
    setSelectedTargetId(image.target.id);
    setTargetSearch(image.target.catalogId || image.target.name);
    setEditModalOpen(true);
  };

  const handleUpdate = (): void => {
    if (!editingImage) return;

    // Only include targetId if it was changed
    const targetChanged = selectedTargetId && selectedTargetId !== editingImage.target.id;

    updateMutation.mutate({
      id: editingImage.id,
      data: {
        visibility: editForm.visibility as ImageUpload['visibility'],
        title: editForm.title || undefined,
        description: editForm.description || undefined,
        featured: editForm.featured,
        ...(targetChanged && { targetId: selectedTargetId }),
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

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'PUBLIC':
        return <IconEye size={12} />;
      case 'PRIVATE':
        return <IconEyeOff size={12} />;
      case 'UNLISTED':
        return <IconLink size={12} />;
      default:
        return <IconEyeOff size={12} />;
    }
  };

  const handleVisibilityChange = (imageId: string, newVisibility: string) => {
    updateMutation.mutate({
      id: imageId,
      data: { visibility: newVisibility as ImageUpload['visibility'] },
    });
  };

  const handleDownload = async (image: ImageUpload) => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = image.title || image.target.name || 'astrophoto.jpg';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
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
                <Card.Section
                  style={{ position: 'relative', cursor: 'pointer' }}
                  onClick={() => setLightboxImage(image)}
                >
                  <Image
                    src={image.url}
                    height={200}
                    alt={image.title || image.target.name}
                    fit="cover"
                  />
                  {/* Clickable overlay with zoom icon */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(0, 0, 0, 0)',
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
                      const icon = e.currentTarget.querySelector('.zoom-icon') as HTMLElement;
                      if (icon) icon.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0)';
                      const icon = e.currentTarget.querySelector('.zoom-icon') as HTMLElement;
                      if (icon) icon.style.opacity = '0';
                    }}
                  >
                    <div
                      className="zoom-icon"
                      style={{
                        opacity: 0,
                        transition: 'opacity 0.2s ease',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: '50%',
                        padding: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconZoomIn size={24} color="#333" />
                    </div>
                  </div>
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
                    <Menu shadow="md" width={140} position="bottom-start">
                      <Menu.Target>
                        <Tooltip label="Click to change visibility">
                          <Badge
                            size="xs"
                            color={getVisibilityColor(image.visibility)}
                            style={{ cursor: 'pointer' }}
                            leftSection={getVisibilityIcon(image.visibility)}
                            rightSection={<IconChevronDown size={10} />}
                          >
                            {image.visibility}
                          </Badge>
                        </Tooltip>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Label>Change visibility</Menu.Label>
                        <Menu.Item
                          leftSection={<IconEyeOff size={14} />}
                          onClick={() => handleVisibilityChange(image.id, 'PRIVATE')}
                          disabled={image.visibility === 'PRIVATE'}
                        >
                          Private
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<IconLink size={14} />}
                          onClick={() => handleVisibilityChange(image.id, 'UNLISTED')}
                          disabled={image.visibility === 'UNLISTED'}
                        >
                          Unlisted
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<IconEye size={14} />}
                          onClick={() => handleVisibilityChange(image.id, 'PUBLIC')}
                          disabled={image.visibility === 'PUBLIC'}
                        >
                          Public
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
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

                  {(image.exposureTimeSec || image.totalIntegrationMin || image.filter) && (
                    <Text size="xs" c="dimmed">
                      {image.exposureTimeSec && `${image.exposureTimeSec}s`}
                      {image.totalIntegrationMin && ` • ${image.totalIntegrationMin.toFixed(1)} min total`}
                      {image.filter && ` • ${image.filter}`}
                      {image.isoGain && ` • ${image.isoGain}`}
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
            setTargetSearch('');
            setSelectedTargetId(null);
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

            <Select
              label="Target"
              description="Change the associated astronomical target"
              placeholder="Search for a target..."
              searchable
              data={
                searchedTargets?.map((t) => ({
                  value: t.id,
                  label: `${t.catalogId || t.name} - ${t.type}`,
                })) || []
              }
              value={selectedTargetId}
              onChange={setSelectedTargetId}
              onSearchChange={setTargetSearch}
              searchValue={targetSearch}
              nothingFoundMessage={
                targetSearch.length < 2
                  ? 'Type at least 2 characters to search'
                  : 'No targets found'
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

            <Group justify="flex-end">
              <Button
                variant="subtle"
                onClick={() => {
                  setEditModalOpen(false);
                  setEditingImage(null);
                  setTargetSearch('');
                  setSelectedTargetId(null);
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

        {/* Lightbox Modal for full-size image viewing */}
        <Modal
          opened={!!lightboxImage}
          onClose={() => setLightboxImage(null)}
          size="100%"
          fullScreen
          withCloseButton={false}
          padding={0}
          styles={{
            body: {
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#000000',
            },
            content: {
              backgroundColor: '#000000',
            },
          }}
        >
          {lightboxImage && (
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header with close button and image info */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 24px',
                  backgroundColor: '#1a1b1e',
                }}
              >
                <div>
                  <Text size="lg" fw={600} c="white">
                    {lightboxImage.title || lightboxImage.target.name}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {lightboxImage.target.catalogId || lightboxImage.target.name}
                    {lightboxImage.exposureTimeSec && ` • ${lightboxImage.exposureTimeSec}s`}
                    {lightboxImage.totalIntegrationMin && ` • ${lightboxImage.totalIntegrationMin.toFixed(1)} min total`}
                    {lightboxImage.filter && ` • ${lightboxImage.filter}`}
                  </Text>
                </div>
                <Group gap="xs">
                  <Button
                    variant="filled"
                    color="blue"
                    size="sm"
                    leftSection={<IconDownload size={16} />}
                    onClick={() => handleDownload(lightboxImage)}
                  >
                    Download
                  </Button>
                  <ActionIcon
                    variant="subtle"
                    color="white"
                    size="xl"
                    onClick={() => setLightboxImage(null)}
                    style={{ color: 'white' }}
                  >
                    <IconX size={28} />
                  </ActionIcon>
                </Group>
              </div>

              {/* Image container */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                  overflow: 'auto',
                }}
                onClick={() => setLightboxImage(null)}
              >
                <img
                  src={lightboxImage.url}
                  alt={lightboxImage.title || lightboxImage.target.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    cursor: 'zoom-out',
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Footer with description if available */}
              {lightboxImage.description && (
                <div
                  style={{
                    padding: '16px 24px',
                    backgroundColor: '#1a1b1e',
                  }}
                >
                  <Text size="sm" c="dimmed">
                    {lightboxImage.description}
                  </Text>
                </div>
              )}
            </div>
          )}
        </Modal>
      </Stack>
    </Container>
  );
}
