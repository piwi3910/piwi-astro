'use client';

import { Container, Title, Text, Button, Stack, Group, Grid, Card, ThemeIcon, Image, Box, Skeleton } from '@mantine/core';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { IconTelescope, IconPhoto, IconTarget, IconCalendar } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';

export default function HomePage(): JSX.Element {
  const { data: session, status } = useSession();

  // Fetch latest public images
  const { data: images, isLoading: imagesLoading } = useQuery({
    queryKey: ['public-images-home'],
    queryFn: async () => {
      const response = await fetch('/api/images?visibility=PUBLIC');
      const data = await response.json();
      return data.slice(0, 6); // Get latest 6 images
    },
  });

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl" align="center" style={{ minHeight: '80vh', justifyContent: 'center' }}>
        <Stack gap="md" align="center">
          <Title order={1} size="3.5rem" ta="center">
            piwi-astro
          </Title>
          <Text size="xl" c="dimmed" ta="center" maw={600}>
            Your complete astrophotography planning and portfolio platform
          </Text>
        </Stack>

        <Group>
          {status === 'loading' ? (
            <Text size="sm">Loading...</Text>
          ) : session ? (
            <>
              <Button
                component={Link}
                href="/dashboard"
                size="lg"
                variant="filled"
              >
                Go to Dashboard
              </Button>
              <Button
                component={Link}
                href="/gallery"
                size="lg"
                variant="outline"
              >
                Browse Gallery
              </Button>
            </>
          ) : (
            <>
              <Button
                component={Link}
                href="/register"
                size="lg"
                variant="filled"
              >
                Get Started
              </Button>
              <Button
                component={Link}
                href="/login"
                size="lg"
                variant="outline"
              >
                Login
              </Button>
              <Button
                component={Link}
                href="/gallery"
                size="lg"
                variant="subtle"
              >
                Browse Gallery
              </Button>
            </>
          )}
        </Group>

        {/* Latest Public Images Section */}
        <Box w="100%" mt="xl">
          <Title order={2} size="2rem" ta="center" mb="md">
            Latest Community Images
          </Title>
          {imagesLoading ? (
            <Grid>
              {[1, 2, 3].map((i) => (
                <Grid.Col key={i} span={{ base: 12, sm: 6, md: 4 }}>
                  <Skeleton height={200} />
                </Grid.Col>
              ))}
            </Grid>
          ) : images && images.length > 0 ? (
            <Grid>
              {images.map((image: any) => (
                <Grid.Col key={image.id} span={{ base: 12, sm: 6, md: 4 }}>
                  <Card shadow="sm" padding="xs" withBorder component={Link} href={`/gallery`} style={{ cursor: 'pointer', textDecoration: 'none' }}>
                    <Card.Section>
                      <Image
                        src={image.url}
                        height={200}
                        alt={image.title || image.target?.name || 'Astrophoto'}
                        fit="cover"
                      />
                    </Card.Section>
                    <Stack gap="xs" mt="xs">
                      <Text fw={500} size="sm" lineClamp={1}>
                        {image.title || image.target?.name || 'Untitled'}
                      </Text>
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        by {image.user?.name || 'Anonymous'}
                      </Text>
                    </Stack>
                  </Card>
                </Grid.Col>
              ))}
            </Grid>
          ) : (
            <Text ta="center" c="dimmed">
              No public images yet. Be the first to share your astrophotography!
            </Text>
          )}
        </Box>

        <Grid mt="xl" w="100%">
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card shadow="sm" padding="lg" withBorder>
              <Stack align="center" gap="md">
                <ThemeIcon size={60} radius="md" variant="light" color="blue">
                  <IconTelescope size={32} />
                </ThemeIcon>
                <div>
                  <Text ta="center" fw={600} mb="xs">
                    Manage Your Gear
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    Track telescopes, cameras, and calculate FOV for perfect framing
                  </Text>
                </div>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card shadow="sm" padding="lg" withBorder>
              <Stack align="center" gap="md">
                <ThemeIcon size={60} radius="md" variant="light" color="grape">
                  <IconTarget size={32} />
                </ThemeIcon>
                <div>
                  <Text ta="center" fw={600} mb="xs">
                    Track Targets
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    Build your wishlist and track progress from planning to processing
                  </Text>
                </div>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card shadow="sm" padding="lg" withBorder>
              <Stack align="center" gap="md">
                <ThemeIcon size={60} radius="md" variant="light" color="cyan">
                  <IconCalendar size={32} />
                </ThemeIcon>
                <div>
                  <Text ta="center" fw={600} mb="xs">
                    Plan Sessions
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    Organize imaging sessions and assign targets with priorities
                  </Text>
                </div>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card shadow="sm" padding="lg" withBorder>
              <Stack align="center" gap="md">
                <ThemeIcon size={60} radius="md" variant="light" color="orange">
                  <IconPhoto size={32} />
                </ThemeIcon>
                <div>
                  <Text ta="center" fw={600} mb="xs">
                    Share Your Work
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    Showcase your astrophotography with the community
                  </Text>
                </div>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
