'use client';

import {
  Container,
  Title,
  Stack,
  Group,
  Text,
  Card,
  CardContent,
  Grid,
  GridCol,
  Badge,
  ThemeIcon,
  Progress,
} from '@/components/ui';
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
import Image from 'next/image';

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

export default function DashboardPage() {
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
      <Container size="xl" className="py-8">
        <Text>Loading dashboard...</Text>
      </Container>
    );
  }

  const targetProgress = stats.targets > 0
    ? (stats.targetsProcessed / stats.targets) * 100
    : 0;

  return (
    <Container size="xl" className="py-4">
      <Stack gap="sm">
        <div>
          <Title order={1}>Dashboard</Title>
          <Text className="text-muted-foreground text-lg">
            Welcome back to piwi-astro
          </Text>
        </div>

        {/* Quick Actions */}
        <Card className="shadow-sm">
          <CardContent className="px-4 py-1">
            <Text className="font-semibold text-lg mb-1">Quick Actions</Text>
            <div className="grid grid-cols-4 gap-2">
              <Link href="/dashboard/gear" style={{ textDecoration: 'none' }}>
                <Card className="px-2 py-1.5 border cursor-pointer hover:bg-accent transition-colors">
                  <Group gap="xs" justify="center">
                    <ThemeIcon size="sm" variant="light" color="blue">
                      <IconSettings size={16} />
                    </ThemeIcon>
                    <Text className="text-sm font-medium">Manage Gear</Text>
                  </Group>
                </Card>
              </Link>
              <Link href="/targets" style={{ textDecoration: 'none' }}>
                <Card className="px-2 py-1.5 border cursor-pointer hover:bg-accent transition-colors">
                  <Group gap="xs" justify="center">
                    <ThemeIcon size="sm" variant="light" color="grape">
                      <IconStar size={16} />
                    </ThemeIcon>
                    <Text className="text-sm font-medium">Browse Targets</Text>
                  </Group>
                </Card>
              </Link>
              <Link href="/dashboard/sessions" style={{ textDecoration: 'none' }}>
                <Card className="px-2 py-1.5 border cursor-pointer hover:bg-accent transition-colors">
                  <Group gap="xs" justify="center">
                    <ThemeIcon size="sm" variant="light" color="cyan">
                      <IconCalendar size={16} />
                    </ThemeIcon>
                    <Text className="text-sm font-medium">Plan Session</Text>
                  </Group>
                </Card>
              </Link>
              <Link href="/dashboard/fov-planner" style={{ textDecoration: 'none' }}>
                <Card className="px-2 py-1.5 border cursor-pointer hover:bg-accent transition-colors">
                  <Group gap="xs" justify="center">
                    <ThemeIcon size="sm" variant="light" color="green">
                      <IconCamera size={16} />
                    </ThemeIcon>
                    <Text className="text-sm font-medium">FOV Planner</Text>
                  </Group>
                </Card>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Grid cols={{ base: 1, md: 2 }} gap="sm">
          {/* Target Progress */}
          <GridCol>
            <Card className="shadow-sm h-full">
              <CardContent className="px-4 py-1">
                <Group justify="between" className="mb-0.5">
                  <Text className="font-semibold text-lg">Target Progress</Text>
                  <ThemeIcon variant="light" color="green" size="sm">
                    <IconTrendingUp size={16} />
                  </ThemeIcon>
                </Group>
                <Group justify="between" className="mb-0.5">
                  <Text className="text-sm text-muted-foreground">Completion Rate</Text>
                  <Text className="text-sm font-semibold">{targetProgress.toFixed(0)}%</Text>
                </Group>
                <Progress value={targetProgress} className="h-2 mb-1" />
                <div className="grid grid-cols-3 gap-2 mb-1">
                  <div>
                    <Text className="text-lg font-bold text-blue-500">{stats.targetsWishlist}</Text>
                    <Text className="text-xs text-muted-foreground">Wishlist</Text>
                  </div>
                  <div>
                    <Text className="text-lg font-bold text-cyan-500">{stats.targetsShot}</Text>
                    <Text className="text-xs text-muted-foreground">Shot</Text>
                  </div>
                  <div>
                    <Text className="text-lg font-bold text-green-500">{stats.targetsProcessed}</Text>
                    <Text className="text-xs text-muted-foreground">Processed</Text>
                  </div>
                </div>
                <Link href="/dashboard/wishlist" style={{ textDecoration: 'none' }}>
                  <Text className="text-sm text-blue-500 cursor-pointer hover:underline">View all targets →</Text>
                </Link>
              </CardContent>
            </Card>
          </GridCol>

          {/* Upcoming Sessions */}
          <GridCol>
            <Card className="shadow-sm h-full">
              <CardContent className="px-4 py-1">
                <Group justify="between" className="mb-0.5">
                  <Text className="font-semibold text-lg">Upcoming Sessions</Text>
                  <ThemeIcon variant="light" color="cyan" size="sm">
                    <IconCalendar size={16} />
                  </ThemeIcon>
                </Group>
                {upcomingSessions && upcomingSessions.length > 0 ? (
                  <div className="space-y-1 mb-1">
                    {upcomingSessions.map((session) => (
                      <Card key={session.id} className="px-2 py-1.5 border">
                        <Group justify="between">
                          <div>
                            <Text className="text-sm font-semibold">
                              {new Date(session.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </Text>
                            <Text className="text-xs text-muted-foreground">{session.location}</Text>
                          </div>
                          <Badge variant="secondary" className="text-xs">{session.sessionTargets.length} targets</Badge>
                        </Group>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Text className="text-sm text-muted-foreground text-center py-1">No upcoming sessions planned</Text>
                )}
                <Link href="/dashboard/sessions" style={{ textDecoration: 'none' }}>
                  <Text className="text-sm text-blue-500 cursor-pointer hover:underline">View all sessions →</Text>
                </Link>
              </CardContent>
            </Card>
          </GridCol>
        </Grid>

        {/* Recent Images */}
        <Card className="shadow-sm">
          <CardContent className="px-4 py-1">
            <Text className="font-semibold text-lg mb-1">Recent Images</Text>
            {recentImages && recentImages.length > 0 ? (
              <div className="grid grid-cols-4 gap-2 mb-1">
                {recentImages.map((image) => (
                  <Card key={image.id} className="shadow-sm overflow-hidden">
                    <div className="relative w-full h-[200px]">
                      <Image src={image.url} alt={image.title || image.target.name} fill className="object-cover" />
                    </div>
                    <CardContent className="p-1">
                      <Text className="text-xs truncate">{image.title || image.target.name}</Text>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Text className="text-sm text-muted-foreground text-center py-1">No images uploaded yet</Text>
            )}
            <Link href="/dashboard/images" style={{ textDecoration: 'none' }}>
              <Text className="text-sm text-blue-500 cursor-pointer hover:underline">View all images →</Text>
            </Link>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="shadow-sm">
          <CardContent className="px-4 py-1">
            <Text className="font-semibold text-lg mb-1">Quick Stats</Text>
            <div className="grid grid-cols-4 gap-2">
              <Card className="px-2 py-1.5 border">
                <Group gap="xs" justify="center">
                  <ThemeIcon size="sm" variant="light" color="blue">
                    <IconTelescope size={16} />
                  </ThemeIcon>
                  <Text className="text-sm font-medium">{stats.telescopes + stats.cameras} Gear</Text>
                </Group>
              </Card>
              <Card className="px-2 py-1.5 border">
                <Group gap="xs" justify="center">
                  <ThemeIcon size="sm" variant="light" color="grape">
                    <IconTarget size={16} />
                  </ThemeIcon>
                  <Text className="text-sm font-medium">{stats.targets} Targets</Text>
                </Group>
              </Card>
              <Card className="px-2 py-1.5 border">
                <Group gap="xs" justify="center">
                  <ThemeIcon size="sm" variant="light" color="cyan">
                    <IconCalendar size={16} />
                  </ThemeIcon>
                  <Text className="text-sm font-medium">{stats.sessions} Sessions</Text>
                </Group>
              </Card>
              <Card className="px-2 py-1.5 border">
                <Group gap="xs" justify="center">
                  <ThemeIcon size="sm" variant="light" color="orange">
                    <IconPhoto size={16} />
                  </ThemeIcon>
                  <Text className="text-sm font-medium">{stats.images} Images</Text>
                </Group>
              </Card>
            </div>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
