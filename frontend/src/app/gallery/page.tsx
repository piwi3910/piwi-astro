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
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { IconSearch, IconEye, IconStar } from '@tabler/icons-react';
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

  const { data: images, isLoading } = useQuery({
    queryKey: ['public-images', search, type, constellation],
    queryFn: () => fetchPublicImages(search, type, constellation),
  });

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
                <Card.Section>
                  <Image
                    src={image.url}
                    height={200}
                    alt={image.title || image.target.name}
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
      </Stack>
    </Container>
  );
}
