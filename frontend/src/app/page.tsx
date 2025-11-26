'use client';

import { useRef } from 'react';
import { Container, Title, Text, Button, Stack, Group, Grid, Card, ThemeIcon, Image, Box, Skeleton, rem } from '@mantine/core';
import { Carousel } from '@mantine/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { IconTelescope, IconPhoto, IconTarget, IconCalendar, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';

export default function HomePage(): JSX.Element {
  const { data: session, status } = useSession();
  const autoplay = useRef(Autoplay({ delay: 4000, stopOnInteraction: false }));

  // Fetch latest public images
  const { data: images, isLoading: imagesLoading } = useQuery({
    queryKey: ['public-images-home'],
    queryFn: async () => {
      const response = await fetch('/api/images?visibility=PUBLIC');
      const data = await response.json();
      return data.slice(0, 10); // Get latest 10 images for carousel
    },
  });

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl" align="center" style={{ minHeight: '80vh', justifyContent: 'center' }}>
        <Stack gap="md" align="center">
          <Group gap="md" align="center">
            <IconTelescope size={56} />
            <Title order={1} size="3.5rem" ta="center">
              piwi-astro
            </Title>
          </Group>
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
          <Title order={2} size="2rem" ta="center" mb="lg">
            Latest Community Images
          </Title>
          {imagesLoading ? (
            <Skeleton height={280} radius="md" />
          ) : images && images.length > 0 ? (
            <Carousel
              height={280}
              slideSize={{ base: '100%', xs: '50%', sm: '33.333%', md: '25%' }}
              slideGap="md"
              loop
              align="start"
              plugins={[autoplay.current]}
              onMouseEnter={autoplay.current.stop}
              onMouseLeave={autoplay.current.reset}
              nextControlIcon={<IconChevronRight style={{ width: rem(20), height: rem(20) }} />}
              previousControlIcon={<IconChevronLeft style={{ width: rem(20), height: rem(20) }} />}
              styles={{
                control: {
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  width: rem(36),
                  height: rem(36),
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  },
                },
                controls: {
                  top: '50%',
                  transform: 'translateY(-50%)',
                },
              }}
            >
              {images.map((image: any) => (
                <Carousel.Slide key={image.id}>
                  <Card
                    shadow="md"
                    padding={0}
                    radius="md"
                    component={Link}
                    href="/gallery"
                    style={{
                      cursor: 'pointer',
                      textDecoration: 'none',
                      height: '100%',
                      overflow: 'hidden',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    }}
                    onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.4)';
                    }}
                    onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '';
                    }}
                  >
                    <div style={{ position: 'relative', height: '100%' }}>
                      <Image
                        src={image.url}
                        alt={image.title || image.target?.name || 'Astrophoto'}
                        height={280}
                        fit="cover"
                      />
                      {/* Gradient overlay for text */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          padding: '12px',
                          background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.6) 60%, transparent)',
                        }}
                      >
                        <Text fw={600} size="sm" c="white" lineClamp={1}>
                          {image.title || image.target?.name || 'Untitled'}
                        </Text>
                        <Text size="xs" c="gray.4" lineClamp={1}>
                          by {image.user?.name || image.user?.username || 'Anonymous'}
                        </Text>
                        {image.target?.type && (
                          <Text size="xs" c="gray.5" mt={2}>
                            {image.target.type}
                          </Text>
                        )}
                      </div>
                    </div>
                  </Card>
                </Carousel.Slide>
              ))}
            </Carousel>
          ) : (
            <Text ta="center" c="dimmed">
              No public images yet. Be the first to share your astrophotography!
            </Text>
          )}
        </Box>

        <Grid mt="xl" w="100%">
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card shadow="sm" padding="lg" withBorder h="100%">
              <Stack align="center" gap="md" h="100%">
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
            <Card shadow="sm" padding="lg" withBorder h="100%">
              <Stack align="center" gap="md" h="100%">
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
            <Card shadow="sm" padding="lg" withBorder h="100%">
              <Stack align="center" gap="md" h="100%">
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
            <Card shadow="sm" padding="lg" withBorder h="100%">
              <Stack align="center" gap="md" h="100%">
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
