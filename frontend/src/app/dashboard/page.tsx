'use client';

import {
  Container,
  Title,
  Stack,
  Group,
  Text,
  Card,
  Grid,
  Badge,
  Image,
  SimpleGrid,
  Paper,
  ThemeIcon,
  Progress,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import {
  IconTelescope,
  IconCamera,
  IconSettings,
  IconStar,
  IconPhoto,
  IconCalendar,
  IconTarget,
  IconTrendingUp,
} from '@tabler/icons-react';
import Link from 'next/link';

interface DashboardStats {
  telescopes: number;
  cameras: number;
  rigs: number;
  locations: number;
  targets: number;
  targetsWishlist: number;
  targetsShot: number;
  targetsProcessed: number;
  sessions: number;
  sessionsUpcoming: number;
  images: number;
  imagesPublic: number;
}

interface RecentImage {
  id: string;
  url: string;
  title: string | null;
  target: {
    name: string;
  };
}

interface UpcomingSession {
  id: string;
  date: string;
  location: string;
  sessionTargets: Array<{ id: string }>;
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const response = await fetch('/api/dashboard-stats');
  if (!response.ok) throw new Error('Failed to fetch dashboard stats');
  return response.json();
}

async function fetchRecentImages(): Promise<RecentImage[]> {
  const response = await fetch('/api/images');
  if (!response.ok) throw new Error('Failed to fetch images');
  const images = await response.json();
  return images.slice(0, 4);
}

async function fetchUpcomingSessions(): Promise<UpcomingSession[]> {
  const response = await fetch('/api/sessions');
  if (!response.ok) throw new Error('Failed to fetch sessions');
  const sessions = await response.json();
  const now = new Date();
  return sessions
    .filter((s: { date: string }) => new Date(s.date) >= now)
    .sort((a: { date: string }, b: { date: string }) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    .slice(0, 3);
}

export default function DashboardPage(): JSX.Element {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  });

  const { data: recentImages } = useQuery({
    queryKey: ['recent-images'],
    queryFn: fetchRecentImages,
  });

  const { data: upcomingSessions } = useQuery({
    queryKey: ['upcoming-sessions'],
    queryFn: fetchUpcomingSessions,
  });

  if (statsLoading || !stats) {
    return (
      <Container size="xl" py="xl">
        <Text>Loading dashboard...</Text>
      </Container>
    );
  }

  const targetProgress = stats.targets > 0
    ? (stats.targetsProcessed / stats.targets) * 100
    : 0;

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={1}>Dashboard</Title>
          <Text c="dimmed" size="lg">
            Welcome back to piwi-astro
          </Text>
        </div>

        {/* Quick Actions */}
        <Card shadow="sm" padding="lg" withBorder>
          <Stack gap="md">
            <Text fw={600} size="lg">
              Quick Actions
            </Text>

            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
              <Link href="/dashboard/gear" style={{ textDecoration: 'none' }}>
                <Paper p="md" withBorder style={{ cursor: 'pointer' }}>
                  <Stack align="center" gap="xs">
                    <ThemeIcon size="xl" variant="light" color="blue">
                      <IconSettings size={24} />
                    </ThemeIcon>
                    <Text size="sm" fw={500} ta="center">
                      Manage Gear
                    </Text>
                  </Stack>
                </Paper>
              </Link>

              <Link href="/targets" style={{ textDecoration: 'none' }}>
                <Paper p="md" withBorder style={{ cursor: 'pointer' }}>
                  <Stack align="center" gap="xs">
                    <ThemeIcon size="xl" variant="light" color="grape">
                      <IconStar size={24} />
                    </ThemeIcon>
                    <Text size="sm" fw={500} ta="center">
                      Browse Targets
                    </Text>
                  </Stack>
                </Paper>
              </Link>

              <Link href="/dashboard/sessions" style={{ textDecoration: 'none' }}>
                <Paper p="md" withBorder style={{ cursor: 'pointer' }}>
                  <Stack align="center" gap="xs">
                    <ThemeIcon size="xl" variant="light" color="cyan">
                      <IconCalendar size={24} />
                    </ThemeIcon>
                    <Text size="sm" fw={500} ta="center">
                      Plan Session
                    </Text>
                  </Stack>
                </Paper>
              </Link>

              <Link href="/dashboard/fov-planner" style={{ textDecoration: 'none' }}>
                <Paper p="md" withBorder style={{ cursor: 'pointer' }}>
                  <Stack align="center" gap="xs">
                    <ThemeIcon size="xl" variant="light" color="green">
                      <IconCamera size={24} />
                    </ThemeIcon>
                    <Text size="sm" fw={500} ta="center">
                      FOV Planner
                    </Text>
                  </Stack>
                </Paper>
              </Link>
            </SimpleGrid>
          </Stack>
        </Card>

        <Grid>
          {/* Target Progress */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card shadow="sm" padding="lg" withBorder h="100%">
              <Stack gap="md" h="100%" justify="space-between">
                <div>
                  <Group justify="space-between" mb="md">
                    <Text fw={600} size="lg">
                      Target Progress
                    </Text>
                    <ThemeIcon variant="light" color="green">
                      <IconTrendingUp size={20} />
                    </ThemeIcon>
                  </Group>

                  <div>
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" c="dimmed">
                        Completion Rate
                      </Text>
                      <Text size="sm" fw={600}>
                        {targetProgress.toFixed(0)}%
                      </Text>
                    </Group>
                    <Progress value={targetProgress} size="lg" radius="xl" />
                  </div>

                  <SimpleGrid cols={3} mt="md">
                    <div>
                      <Text size="xl" fw={700} c="blue">
                        {stats.targetsWishlist}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Wishlist
                      </Text>
                    </div>
                    <div>
                      <Text size="xl" fw={700} c="cyan">
                        {stats.targetsShot}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Shot
                      </Text>
                    </div>
                    <div>
                      <Text size="xl" fw={700} c="green">
                        {stats.targetsProcessed}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Processed
                      </Text>
                    </div>
                  </SimpleGrid>
                </div>

                <Link href="/dashboard/wishlist" style={{ textDecoration: 'none' }}>
                  <Text size="sm" c="blue" style={{ cursor: 'pointer' }}>
                    View all targets →
                  </Text>
                </Link>
              </Stack>
            </Card>
          </Grid.Col>

          {/* Upcoming Sessions */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card shadow="sm" padding="lg" withBorder h="100%">
              <Stack gap="md" h="100%" justify="space-between">
                <div>
                  <Group justify="space-between" mb="md">
                    <Text fw={600} size="lg">
                      Upcoming Sessions
                    </Text>
                    <ThemeIcon variant="light" color="cyan">
                      <IconCalendar size={20} />
                    </ThemeIcon>
                  </Group>

                  {upcomingSessions && upcomingSessions.length > 0 ? (
                    <Stack gap="sm">
                      {upcomingSessions.map((session) => (
                        <Paper key={session.id} p="sm" withBorder>
                          <Group justify="space-between">
                            <div>
                              <Text size="sm" fw={600}>
                                {new Date(session.date).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {session.location}
                              </Text>
                            </div>
                            <Badge size="sm" variant="light">
                              {session.sessionTargets.length} targets
                            </Badge>
                          </Group>
                        </Paper>
                      ))}
                    </Stack>
                  ) : (
                    <Text size="sm" c="dimmed" ta="center" py="md">
                      No upcoming sessions planned
                    </Text>
                  )}
                </div>

                <Link href="/dashboard/sessions" style={{ textDecoration: 'none' }}>
                  <Text size="sm" c="blue" style={{ cursor: 'pointer' }}>
                    View all sessions →
                  </Text>
                </Link>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Recent Images */}
        <Card shadow="sm" padding="lg" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={600} size="lg">
                Recent Images
              </Text>
              <ThemeIcon variant="light" color="orange">
                <IconPhoto size={20} />
              </ThemeIcon>
            </Group>

            {recentImages && recentImages.length > 0 ? (
              <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                {recentImages.map((image) => (
                  <Card key={image.id} shadow="xs" padding="xs" withBorder>
                    <Card.Section>
                      <Image
                        src={image.url}
                        height={120}
                        alt={image.title || image.target.name}
                        fit="cover"
                      />
                    </Card.Section>
                    <Text size="xs" mt="xs" lineClamp={1}>
                      {image.title || image.target.name}
                    </Text>
                  </Card>
                ))}
              </SimpleGrid>
            ) : (
              <Text size="sm" c="dimmed" ta="center" py="md">
                No images uploaded yet
              </Text>
            )}

            <Link href="/dashboard/images" style={{ textDecoration: 'none' }}>
              <Text size="sm" c="blue" style={{ cursor: 'pointer' }}>
                View all images →
              </Text>
            </Link>
          </Stack>
        </Card>

        {/* Quick Stats */}
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
          <Paper p="md" withBorder>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Gear
                </Text>
                <Text size="xl" fw={700}>
                  {stats.telescopes + stats.cameras}
                </Text>
                <Text size="xs" c="dimmed">
                  {stats.rigs} rigs configured
                </Text>
              </div>
              <ThemeIcon size="xl" variant="light" color="blue">
                <IconTelescope size={24} />
              </ThemeIcon>
            </Group>
          </Paper>

          <Paper p="md" withBorder>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Targets
                </Text>
                <Text size="xl" fw={700}>
                  {stats.targets}
                </Text>
                <Text size="xs" c="dimmed">
                  {stats.targetsWishlist} in wishlist
                </Text>
              </div>
              <ThemeIcon size="xl" variant="light" color="grape">
                <IconTarget size={24} />
              </ThemeIcon>
            </Group>
          </Paper>

          <Paper p="md" withBorder>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Sessions
                </Text>
                <Text size="xl" fw={700}>
                  {stats.sessions}
                </Text>
                <Text size="xs" c="dimmed">
                  {stats.sessionsUpcoming} upcoming
                </Text>
              </div>
              <ThemeIcon size="xl" variant="light" color="cyan">
                <IconCalendar size={24} />
              </ThemeIcon>
            </Group>
          </Paper>

          <Paper p="md" withBorder>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Images
                </Text>
                <Text size="xl" fw={700}>
                  {stats.images}
                </Text>
                <Text size="xs" c="dimmed">
                  {stats.imagesPublic} public
                </Text>
              </div>
              <ThemeIcon size="xl" variant="light" color="orange">
                <IconPhoto size={24} />
              </ThemeIcon>
            </Group>
          </Paper>
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
