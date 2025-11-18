'use client';

import { use } from 'react';
import {
  Container,
  Title,
  Stack,
  Group,
  Text,
  Avatar,
  Card,
  Image,
  Badge,
  SimpleGrid,
  Paper,
  Loader,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { IconEye, IconStar, IconCalendar } from '@tabler/icons-react';

interface Target {
  catalogId: string | null;
  name: string;
  type: string;
}

interface ImageUpload {
  id: string;
  filename: string;
  url: string;
  visibility: string;
  title: string | null;
  description: string | null;
  featured: boolean;
  viewCount: number;
  captureDate: string | null;
  target: Target;
  createdAt: string;
}

interface UserProfile {
  id: string;
  username: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  profileVisibility: string;
  createdAt: string;
  imageUploads: ImageUpload[];
  publicImageCount: number;
}

async function fetchUserProfile(username: string): Promise<UserProfile> {
  const response = await fetch(`/api/users/${username}`);
  if (!response.ok) {
    if (response.status === 404) throw new Error('User not found');
    if (response.status === 403) throw new Error('Profile is private');
    throw new Error('Failed to fetch user profile');
  }
  return response.json();
}

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}): JSX.Element {
  const { username } = use(params);

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['user-profile', username],
    queryFn: () => fetchUserProfile(username),
  });

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center">
          <Loader size="lg" />
          <Text>Loading profile...</Text>
        </Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center">
          <Text c="red" size="lg">
            {(error as Error).message}
          </Text>
        </Stack>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center">
          <Text c="dimmed" size="lg">
            Profile not found
          </Text>
        </Stack>
      </Container>
    );
  }

  const joinDate = new Date(profile.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* User Header */}
        <Paper p="xl" withBorder>
          <Group align="flex-start">
            <Avatar
              src={profile.avatarUrl}
              size={120}
              radius="md"
              alt={profile.name || profile.username}
            />
            <Stack gap="xs" style={{ flex: 1 }}>
              <div>
                <Title order={1}>{profile.name || profile.username}</Title>
                <Text c="dimmed" size="lg">
                  @{profile.username}
                </Text>
              </div>

              {profile.bio && (
                <Text size="md" mt="sm">
                  {profile.bio}
                </Text>
              )}

              <Group gap="lg" mt="md">
                <Group gap="xs">
                  <IconCalendar size={16} />
                  <Text size="sm" c="dimmed">
                    Joined {joinDate}
                  </Text>
                </Group>
                <Group gap="xs">
                  <Text size="sm" fw={600}>
                    {profile.publicImageCount}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Public Images
                  </Text>
                </Group>
              </Group>
            </Stack>
          </Group>
        </Paper>

        {/* Gallery */}
        <div>
          <Title order={2} mb="md">
            Gallery
          </Title>

          {profile.imageUploads.length > 0 ? (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
              {profile.imageUploads.map((image) => (
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

                    <Badge size="xs" variant="light">
                      {image.target.type}
                    </Badge>

                    {image.description && (
                      <Text size="xs" c="dimmed" lineClamp={2}>
                        {image.description}
                      </Text>
                    )}

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
              No public images yet
            </Text>
          )}
        </div>
      </Stack>
    </Container>
  );
}
