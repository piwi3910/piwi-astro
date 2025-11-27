'use client';

import { use } from 'react';
import {
  Container,
  Title,
  Stack,
  Group,
  Text,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Card,
  CardContent,
  Badge,
  Grid,
  GridCol,
  Loader,
} from '@/components/ui';
import { useQuery } from '@tanstack/react-query';
import { IconEye, IconStar, IconCalendar } from '@tabler/icons-react';
import Image from 'next/image';

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
}) {
  const { username } = use(params);

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['user-profile', username],
    queryFn: () => fetchUserProfile(username),
  });

  if (isLoading) {
    return (
      <Container size="xl" className="py-8">
        <Stack align="center">
          <Loader size="lg" />
          <Text>Loading profile...</Text>
        </Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" className="py-8">
        <Stack align="center">
          <Text className="text-destructive text-lg">
            {(error as Error).message}
          </Text>
        </Stack>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Container size="xl" className="py-8">
        <Stack align="center">
          <Text className="text-muted-foreground text-lg">
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
    <Container size="xl" className="py-8">
      <Stack gap="lg">
        {/* User Header */}
        <Card className="p-6 border">
          <Group align="start">
            <Avatar className="w-[120px] h-[120px] rounded-md">
              <AvatarImage
                src={profile.avatarUrl || undefined}
                alt={profile.name || profile.username}
              />
              <AvatarFallback className="rounded-md text-2xl">
                {(profile.name || profile.username).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Stack gap="xs" className="flex-1">
              <div>
                <Title order={1}>{profile.name || profile.username}</Title>
                <Text className="text-muted-foreground text-lg">
                  @{profile.username}
                </Text>
              </div>

              {profile.bio && (
                <Text className="text-base mt-2">
                  {profile.bio}
                </Text>
              )}

              <Group gap="lg" className="mt-4">
                <Group gap="xs">
                  <IconCalendar size={16} />
                  <Text className="text-sm text-muted-foreground">
                    Joined {joinDate}
                  </Text>
                </Group>
                <Group gap="xs">
                  <Text className="text-sm font-semibold">
                    {profile.publicImageCount}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    Public Images
                  </Text>
                </Group>
              </Group>
            </Stack>
          </Group>
        </Card>

        {/* Gallery */}
        <div>
          <Title order={2} className="mb-4">
            Gallery
          </Title>

          {profile.imageUploads.length > 0 ? (
            <Grid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} gap="md">
              {profile.imageUploads.map((image) => (
                <GridCol key={image.id}>
                  <Card className="shadow-sm border">
                    <div className="relative w-full h-[200px] overflow-hidden rounded-t-lg">
                      <Image
                        src={image.url}
                        alt={image.title || image.target.name}
                        fill
                        className="object-cover"
                      />
                    </div>

                    <CardContent className="p-3">
                      <Stack gap="xs" className="mt-2">
                        <Group justify="between" align="start">
                          <div className="flex-1">
                            <Text className="font-semibold text-sm line-clamp-1">
                              {image.title || image.target.name}
                            </Text>
                            <Text className="text-xs text-muted-foreground">
                              {image.target.catalogId || image.target.name}
                            </Text>
                          </div>
                          {image.featured && (
                            <IconStar size={16} fill="gold" color="gold" />
                          )}
                        </Group>

                        <Badge variant="secondary" className="text-xs w-fit">
                          {image.target.type}
                        </Badge>

                        {image.description && (
                          <Text className="text-xs text-muted-foreground line-clamp-2">
                            {image.description}
                          </Text>
                        )}

                        <Group justify="between">
                          {image.captureDate && (
                            <Text className="text-xs text-muted-foreground">
                              {new Date(image.captureDate).toLocaleDateString()}
                            </Text>
                          )}
                          {image.viewCount > 0 && (
                            <Group gap="md">
                              <IconEye size={12} />
                              <Text className="text-xs text-muted-foreground">
                                {image.viewCount}
                              </Text>
                            </Group>
                          )}
                        </Group>
                      </Stack>
                    </CardContent>
                  </Card>
                </GridCol>
              ))}
            </Grid>
          ) : (
            <Text className="text-muted-foreground text-center py-8">
              No public images yet
            </Text>
          )}
        </div>
      </Stack>
    </Container>
  );
}
