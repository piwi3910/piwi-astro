'use client';

import { useState } from 'react';
import {
  Container,
  Title,
  Stack,
  Group,
  Text,
  Card,
  Image,
  Badge,
  SimpleGrid,
  Select,
  TextInput,
  Loader,
  Avatar,
  Modal,
  Button,
  ActionIcon,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { IconSearch, IconEye, IconStar, IconZoomIn, IconDownload, IconX } from '@tabler/icons-react';
import Link from 'next/link';

interface Target {
  catalogId: string | null;
  name: string;
  type: string;
  constellation: string | null;
}

interface User {
  id: string;
  username: string;
  name: string | null;
}

interface ImageUpload {
  id: string;
  filename: string;
  url: string;
  title: string | null;
  description: string | null;
  featured: boolean;
  viewCount: number;
  captureDate: string | null;
  target: Target;
  user: User;
  createdAt: string;
}

async function fetchPublicImages(
  search: string,
  type: string,
  constellation: string
): Promise<ImageUpload[]> {
  const params = new URLSearchParams({
    visibility: 'PUBLIC',
    ...(search && { search }),
    ...(type && { type }),
    ...(constellation && { constellation }),
  });

  const response = await fetch(`/api/images?${params}`);
  if (!response.ok) throw new Error('Failed to fetch images');
  return response.json();
}

export default function GalleryPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [constellation, setConstellation] = useState('');
  const [lightboxImage, setLightboxImage] = useState<ImageUpload | null>(null);

  const { data: images, isLoading } = useQuery({
    queryKey: ['public-images', search, type, constellation],
    queryFn: () => fetchPublicImages(search, type, constellation),
  });

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
          <Loader size="lg" />
          <Text>Loading gallery...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={1}>Public Gallery</Title>
          <Text c="dimmed" size="lg">
            Explore astrophotography images from our community
          </Text>
        </div>

        {/* Filters */}
        <Group>
          <TextInput
            placeholder="Search by title, target, or photographer..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="All types"
            clearable
            data={[
              'Galaxy',
              'Emission Nebula',
              'Planetary Nebula',
              'Supernova Remnant',
              'Open Cluster',
              'Globular Cluster',
            ]}
            value={type}
            onChange={(val) => setType(val || '')}
            style={{ width: 200 }}
          />
          <Select
            placeholder="All constellations"
            clearable
            searchable
            data={[
              'Andromeda',
              'Aquarius',
              'Canes Venatici',
              'Cassiopeia',
              'Cepheus',
              'Coma Berenices',
              'Cygnus',
              'Hercules',
              'Lyra',
              'Monoceros',
              'Orion',
              'Perseus',
              'Sagittarius',
              'Serpens',
              'Taurus',
              'Triangulum',
              'Ursa Major',
              'Virgo',
              'Vulpecula',
            ]}
            value={constellation}
            onChange={(val) => setConstellation(val || '')}
            style={{ width: 200 }}
          />
        </Group>

        {/* Gallery Grid */}
        {images && images.length > 0 ? (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
            {images.map((image) => (
              <Card key={image.id} shadow="sm" padding="sm" withBorder>
                <Card.Section style={{ position: 'relative' }}>
                  <Image
                    src={image.url}
                    height={200}
                    alt={image.title || image.target.name}
                    fit="cover"
                  />
                  <div
                    onClick={() => setLightboxImage(image)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(0, 0, 0, 0.4)',
                      opacity: 0,
                      transition: 'opacity 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                  >
                    <IconZoomIn size={32} color="white" />
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
                    <Badge size="xs" variant="light">
                      {image.target.type}
                    </Badge>
                    {image.target.constellation && (
                      <Badge size="xs" variant="outline">
                        {image.target.constellation}
                      </Badge>
                    )}
                  </Group>

                  {image.description && (
                    <Text size="xs" c="dimmed" lineClamp={2}>
                      {image.description}
                    </Text>
                  )}

                  {/* Photographer Info */}
                  <Link
                    href={`/users/${image.user.username}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <Group gap="xs" mt="xs">
                      <Avatar size="xs" radius="xl" />
                      <Text size="xs" fw={500}>
                        {image.user.name || image.user.username}
                      </Text>
                    </Group>
                  </Link>

                  <Group justify="space-between">
                    {image.captureDate && (
                      <Text size="xs" c="dimmed">
                        {new Date(image.captureDate).toLocaleDateString()}
                      </Text>
                    )}
                    {image.viewCount > 0 && (
                      <Group gap={4}>
                        <IconEye size={12} />
                        <Text size="xs" c="dimmed">
                          {image.viewCount}
                        </Text>
                      </Group>
                    )}
                  </Group>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        ) : (
          <Text c="dimmed" ta="center" py="xl">
            No public images found. Try adjusting your filters.
          </Text>
        )}

        {/* Lightbox Modal */}
        <Modal
          opened={!!lightboxImage}
          onClose={() => setLightboxImage(null)}
          size="auto"
          padding={0}
          withCloseButton={false}
          centered
          styles={{
            content: {
              background: 'transparent',
              boxShadow: 'none',
              maxWidth: '95vw',
              maxHeight: '95vh',
            },
            body: {
              padding: 0,
            },
          }}
        >
          {lightboxImage && (
            <div style={{ position: 'relative' }}>
              {/* Header with info and controls */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  padding: '12px 16px',
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  zIndex: 10,
                }}
              >
                <div>
                  <Text size="lg" fw={600} c="white">
                    {lightboxImage.title || lightboxImage.target.name}
                  </Text>
                  <Text size="sm" c="gray.3">
                    {lightboxImage.target.catalogId || lightboxImage.target.type}
                    {lightboxImage.target.constellation && ` • ${lightboxImage.target.constellation}`}
                  </Text>
                  <Link
                    href={`/users/${lightboxImage.user.username}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <Text size="xs" c="gray.4" mt={4}>
                      by {lightboxImage.user.name || lightboxImage.user.username}
                    </Text>
                  </Link>
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
                    variant="filled"
                    color="dark"
                    size="lg"
                    onClick={() => setLightboxImage(null)}
                  >
                    <IconX size={18} />
                  </ActionIcon>
                </Group>
              </div>

              {/* Image */}
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title || lightboxImage.target.name}
                style={{
                  maxWidth: '95vw',
                  maxHeight: '95vh',
                  objectFit: 'contain',
                  display: 'block',
                  borderRadius: '8px',
                }}
              />

              {/* Footer with description */}
              {lightboxImage.description && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '12px 16px',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                  }}
                >
                  <Text size="sm" c="gray.3">
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
