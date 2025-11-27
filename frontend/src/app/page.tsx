'use client';

import { useRef } from 'react';
import { Container } from '@/components/ui/container';
import { Title } from '@/components/ui/title';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Stack } from '@/components/ui/stack';
import { Group } from '@/components/ui/group';
import { Grid, GridCol } from '@/components/ui/grid';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeIcon } from '@/components/ui/theme-icon';
import { Box } from '@/components/ui/box';
import { Skeleton } from '@/components/ui/skeleton';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { IconTelescope, IconPhoto, IconTarget, IconCalendar } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';

export default function HomePage() {
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
    <Container size="lg" className="py-12">
      <Stack gap="xl" className="items-center min-h-[80vh] justify-center">
        <Stack gap="md" className="items-center">
          <Group gap="md" className="items-center">
            <IconTelescope size={56} />
            <Title order={1} className="text-[3.5rem] text-center">
              piwi-astro
            </Title>
          </Group>
          <Text size="xl" c="muted" className="text-center max-w-[600px]">
            Your complete free astrophotography planning and portfolio platform
          </Text>
        </Stack>

        <Group>
          {status === 'loading' ? (
            <Text size="sm">Loading...</Text>
          ) : session ? (
            <>
              <Button
                asChild
                size="lg"
                variant="default"
              >
                <Link href="/dashboard">
                  Go to Dashboard
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
              >
                <Link href="/gallery">
                  Browse Gallery
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button
                asChild
                size="lg"
                variant="default"
              >
                <Link href="/register">
                  Get Started
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
              >
                <Link href="/login">
                  Login
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
              >
                <Link href="/gallery">
                  Browse Gallery
                </Link>
              </Button>
            </>
          )}
        </Group>

        {/* Latest Public Images Section */}
        <Box className="w-full mt-12">
          <Title order={2} className="text-[2rem] text-center mb-6">
            Latest Community Images
          </Title>
          {imagesLoading ? (
            <Skeleton className="h-[280px] w-full rounded-md" />
          ) : images && images.length > 0 ? (
            <Carousel
              plugins={[autoplay.current]}
              onMouseEnter={autoplay.current.stop}
              onMouseLeave={autoplay.current.reset}
              opts={{
                align: 'start',
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent>
                {images.map((image: any) => (
                  <CarouselItem key={image.id} className="basis-full xs:basis-1/2 sm:basis-1/3 md:basis-1/4 pl-4">
                    <Link
                      href="/gallery"
                      className="block h-full no-underline"
                    >
                      <Card
                        className="shadow-md p-0 rounded-md h-[280px] overflow-hidden cursor-pointer transition-all duration-200 ease-in-out hover:-translate-y-1 hover:shadow-2xl"
                      >
                        <div className="relative h-full">
                          <Image
                            src={image.url}
                            alt={image.title || image.target?.name || 'Astrophoto'}
                            fill
                            className="object-cover"
                          />
                          {/* Gradient overlay for text */}
                          <div
                            className="absolute bottom-0 left-0 right-0 p-3"
                            style={{
                              background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.6) 60%, transparent)',
                            }}
                          >
                            <Text className="font-semibold text-sm text-white line-clamp-1">
                              {image.title || image.target?.name || 'Untitled'}
                            </Text>
                            <Text size="xs" className="text-gray-400 line-clamp-1">
                              by {image.user?.name || image.user?.username || 'Anonymous'}
                            </Text>
                            {image.target?.type && (
                              <Text size="xs" className="text-gray-500 mt-0.5">
                                {image.target.type}
                              </Text>
                            )}
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </Carousel>
          ) : (
            <Text className="text-center" c="muted">
              No public images yet. Be the first to share your astrophotography!
            </Text>
          )}
        </Box>

        <Grid cols={4} className="mt-12 w-full">
          <GridCol span={{ base: 12, sm: 6, md: 3 }}>
            <Card className="shadow-sm border h-full">
              <CardContent className="p-6">
                <Stack gap="md" className="items-center h-full">
                  <ThemeIcon size={60} radius="md" variant="light" color="blue">
                    <IconTelescope size={32} />
                  </ThemeIcon>
                  <div>
                    <Text className="text-center font-semibold mb-2">
                      Manage Your Gear
                    </Text>
                    <Text size="sm" c="muted" className="text-center">
                      Track telescopes, cameras, and calculate FOV for perfect framing
                    </Text>
                  </div>
                </Stack>
              </CardContent>
            </Card>
          </GridCol>

          <GridCol span={{ base: 12, sm: 6, md: 3 }}>
            <Card className="shadow-sm border h-full">
              <CardContent className="p-6">
                <Stack gap="md" className="items-center h-full">
                  <ThemeIcon size={60} radius="md" variant="light" color="grape">
                    <IconTarget size={32} />
                  </ThemeIcon>
                  <div>
                    <Text className="text-center font-semibold mb-2">
                      Track Targets
                    </Text>
                    <Text size="sm" c="muted" className="text-center">
                      Build your wishlist and track progress from planning to processing
                    </Text>
                  </div>
                </Stack>
              </CardContent>
            </Card>
          </GridCol>

          <GridCol span={{ base: 12, sm: 6, md: 3 }}>
            <Card className="shadow-sm border h-full">
              <CardContent className="p-6">
                <Stack gap="md" className="items-center h-full">
                  <ThemeIcon size={60} radius="md" variant="light" color="cyan">
                    <IconCalendar size={32} />
                  </ThemeIcon>
                  <div>
                    <Text className="text-center font-semibold mb-2">
                      Plan Sessions
                    </Text>
                    <Text size="sm" c="muted" className="text-center">
                      Organize imaging sessions and assign targets with priorities
                    </Text>
                  </div>
                </Stack>
              </CardContent>
            </Card>
          </GridCol>

          <GridCol span={{ base: 12, sm: 6, md: 3 }}>
            <Card className="shadow-sm border h-full">
              <CardContent className="p-6">
                <Stack gap="md" className="items-center h-full">
                  <ThemeIcon size={60} radius="md" variant="light" color="orange">
                    <IconPhoto size={32} />
                  </ThemeIcon>
                  <div>
                    <Text className="text-center font-semibold mb-2">
                      Share Your Work
                    </Text>
                    <Text size="sm" c="muted" className="text-center">
                      Showcase your astrophotography with the community
                    </Text>
                  </div>
                </Stack>
              </CardContent>
            </Card>
          </GridCol>
        </Grid>
      </Stack>
    </Container>
  );
}
