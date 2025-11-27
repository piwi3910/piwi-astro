'use client';

import { useState } from 'react';
import {
  Container,
  Stack,
  Group,
  Grid,
  GridCol,
  Title,
  Text,
  Card,
  CardContent,
  Button,
  Badge,
  Loader,
} from '@/components/ui';
import { TextInput } from '@/components/ui/text-input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDebouncedValue } from '@/hooks';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IconSearch, IconEye, IconStar, IconZoomIn, IconDownload, IconX, IconHeart, IconHeartFilled, IconShare } from '@tabler/icons-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

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
  downloadCount: number;
  likeCount: number;
  isLiked: boolean;
  captureDate: string | null;
  target: Target;
  user: User;
  createdAt: string;
}

async function fetchPublicImages(
  search: string,
  type: string,
  constellation: string,
  sortBy: string
): Promise<ImageUpload[]> {
  const params = new URLSearchParams({
    visibility: 'PUBLIC',
    ...(search && { search }),
    ...(type && { type }),
    ...(constellation && { constellation }),
    ...(sortBy && { sortBy }),
  });

  const response = await fetch(`/api/images?${params}`);
  if (!response.ok) throw new Error('Failed to fetch images');
  return response.json();
}

async function trackView(imageId: string): Promise<void> {
  await fetch(`/api/images/${imageId}/view`, { method: 'POST' });
}

async function trackDownload(imageId: string): Promise<void> {
  await fetch(`/api/images/${imageId}/download`, { method: 'POST' });
}

async function likeImage(imageId: string): Promise<{ liked: boolean; likeCount: number }> {
  const response = await fetch(`/api/images/${imageId}/like`, { method: 'POST' });
  return response.json();
}

async function unlikeImage(imageId: string): Promise<{ liked: boolean; likeCount: number }> {
  const response = await fetch(`/api/images/${imageId}/like`, { method: 'DELETE' });
  return response.json();
}

export default function GalleryPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 500);
  const [type, setType] = useState('');
  const [constellation, setConstellation] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [lightboxImage, setLightboxImage] = useState<ImageUpload | null>(null);

  const { data: images, isLoading } = useQuery({
    queryKey: ['public-images', debouncedSearch, type, constellation, sortBy],
    queryFn: () => fetchPublicImages(debouncedSearch, type, constellation, sortBy),
  });

  // Mutation for liking/unliking images
  const likeMutation = useMutation({
    mutationFn: async ({ imageId, isLiked }: { imageId: string; isLiked: boolean }) => {
      if (isLiked) {
        return unlikeImage(imageId);
      } else {
        return likeImage(imageId);
      }
    },
    onSuccess: (data, variables) => {
      // Update the image's like count and isLiked status in the cache
      queryClient.setQueryData(
        ['public-images', debouncedSearch, type, constellation, sortBy],
        (oldData: ImageUpload[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map((img) =>
            img.id === variables.imageId
              ? { ...img, likeCount: data.likeCount, isLiked: data.liked }
              : img
          );
        }
      );
    },
  });

  const handleLikeClick = (e: React.MouseEvent, image: ImageUpload) => {
    e.stopPropagation();
    if (!session) return; // Must be logged in to like
    likeMutation.mutate({ imageId: image.id, isLiked: image.isLiked });
  };

  const handleOpenLightbox = (image: ImageUpload) => {
    setLightboxImage(image);
    // Track view when opening lightbox
    trackView(image.id);
  };

  const handleCloseLightbox = () => {
    setLightboxImage(null);
    // Invalidate cache to refetch with updated view counts (important for "Most Viewed" sort)
    queryClient.invalidateQueries({ queryKey: ['public-images', debouncedSearch, type, constellation, sortBy] });
  };

  const handleDownload = async (image: ImageUpload) => {
    try {
      // Track download
      trackDownload(image.id);

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

  return (
    <Container size="xl" className="py-8">
      <Stack gap="lg">
        <div>
          <Title order={1}>Public Gallery</Title>
          <Text c="muted" size="lg">
            Explore astrophotography images from our community
          </Text>
        </div>

        {/* Filters */}
        <Group className="flex-wrap">
          <TextInput
            placeholder="Search by title, target, or photographer..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px]"
          />
          <Select value={type || 'all'} onValueChange={(val) => setType(val === 'all' ? '' : val)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="Galaxy">Galaxy</SelectItem>
              <SelectItem value="Emission Nebula">Emission Nebula</SelectItem>
              <SelectItem value="Planetary Nebula">Planetary Nebula</SelectItem>
              <SelectItem value="Supernova Remnant">Supernova Remnant</SelectItem>
              <SelectItem value="Open Cluster">Open Cluster</SelectItem>
              <SelectItem value="Globular Cluster">Globular Cluster</SelectItem>
            </SelectContent>
          </Select>
          <Select value={constellation || 'all'} onValueChange={(val) => setConstellation(val === 'all' ? '' : val)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All constellations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All constellations</SelectItem>
              <SelectItem value="Andromeda">Andromeda</SelectItem>
              <SelectItem value="Aquarius">Aquarius</SelectItem>
              <SelectItem value="Canes Venatici">Canes Venatici</SelectItem>
              <SelectItem value="Cassiopeia">Cassiopeia</SelectItem>
              <SelectItem value="Cepheus">Cepheus</SelectItem>
              <SelectItem value="Coma Berenices">Coma Berenices</SelectItem>
              <SelectItem value="Cygnus">Cygnus</SelectItem>
              <SelectItem value="Hercules">Hercules</SelectItem>
              <SelectItem value="Lyra">Lyra</SelectItem>
              <SelectItem value="Monoceros">Monoceros</SelectItem>
              <SelectItem value="Orion">Orion</SelectItem>
              <SelectItem value="Perseus">Perseus</SelectItem>
              <SelectItem value="Sagittarius">Sagittarius</SelectItem>
              <SelectItem value="Serpens">Serpens</SelectItem>
              <SelectItem value="Taurus">Taurus</SelectItem>
              <SelectItem value="Triangulum">Triangulum</SelectItem>
              <SelectItem value="Ursa Major">Ursa Major</SelectItem>
              <SelectItem value="Virgo">Virgo</SelectItem>
              <SelectItem value="Vulpecula">Vulpecula</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(val) => setSortBy(val || 'latest')}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest</SelectItem>
              <SelectItem value="mostViewed">Most Viewed</SelectItem>
              <SelectItem value="mostDownloaded">Most Downloaded</SelectItem>
              <SelectItem value="mostLiked">Most Liked</SelectItem>
            </SelectContent>
          </Select>
        </Group>

        {/* Gallery Grid */}
        {isLoading ? (
          <Stack align="center" className="py-8">
            <Loader size="lg" />
            <Text c="muted">Loading images...</Text>
          </Stack>
        ) : images && images.length > 0 ? (
          <Grid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} gap="md">
            {images.map((image) => (
              <GridCol key={image.id}>
                <Card className="shadow-sm border">
                  <CardContent className="p-3">
                    <div className="relative mb-3">
                      <div className="relative h-[200px] overflow-hidden rounded-md">
                        <Image
                          src={image.url}
                          alt={image.title || image.target.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div
                        onClick={() => handleOpenLightbox(image)}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer rounded-md"
                      >
                        <IconZoomIn size={32} color="white" />
                      </div>
                    </div>

                    <Stack gap="xs">
                      <Group justify="between" align="start">
                        <div className="flex-1 min-w-0">
                          <Text fw="semibold" size="sm" className="truncate">
                            {image.title || image.target.name}
                          </Text>
                          <Text size="xs" c="muted">
                            {image.target.catalogId || image.target.name}
                          </Text>
                        </div>
                        {image.featured && (
                          <IconStar size={16} fill="gold" color="gold" />
                        )}
                      </Group>

                      <Group gap="xs">
                        <Badge size="sm" variant="secondary">
                          {image.target.type}
                        </Badge>
                        {image.target.constellation && (
                          <Badge size="sm" variant="outline">
                            {image.target.constellation}
                          </Badge>
                        )}
                      </Group>

                      {image.description && (
                        <Text size="xs" c="muted" className="line-clamp-2">
                          {image.description}
                        </Text>
                      )}

                      <Group justify="between" align="center" className="mt-2">
                        {/* Photographer Info */}
                        <Link
                          href={`/users/${image.user.username}`}
                          className="no-underline text-inherit"
                        >
                          <Group gap="xs">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback>
                                {(image.user.name || image.user.username).charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <Text size="xs" fw="medium">
                              {image.user.name || image.user.username}
                            </Text>
                          </Group>
                        </Link>

                        {/* Likes and Views */}
                        <Group gap="xs">
                          {image.viewCount > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Group gap="xs">
                                    <IconEye size={12} />
                                    <Text size="xs" c="muted">
                                      {image.viewCount}
                                    </Text>
                                  </Group>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Views</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "h-6 w-6 p-0",
                                    image.isLiked ? "text-red-500" : "text-gray-500"
                                  )}
                                  onClick={(e) => handleLikeClick(e, image)}
                                  disabled={!session}
                                >
                                  {image.isLiked ? (
                                    <IconHeartFilled size={14} />
                                  ) : (
                                    <IconHeart size={14} />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{session ? (image.isLiked ? 'Unlike' : 'Like') : 'Login to like'}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {image.likeCount > 0 && (
                            <Text size="xs" c="muted">
                              {image.likeCount}
                            </Text>
                          )}
                        </Group>
                      </Group>
                    </Stack>
                  </CardContent>
                </Card>
              </GridCol>
            ))}
          </Grid>
        ) : (
          <Text c="muted" ta="center" className="py-8">
            No public images found. Try adjusting your filters.
          </Text>
        )}

        {/* Lightbox Dialog */}
        <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && handleCloseLightbox()}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 bg-black border-none flex items-center justify-center" showCloseButton={false}>
            <DialogTitle className="sr-only">
              {lightboxImage?.title || lightboxImage?.target?.name || 'Image Preview'}
            </DialogTitle>
            {lightboxImage && (
              <div className="relative flex items-center justify-center">
                {/* Header with info and controls */}
                <div
                  className="absolute top-0 left-0 right-0 p-3 z-10 flex justify-between items-start"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
                  }}
                >
                  <div>
                    <Text size="lg" fw="semibold" className="text-white">
                      {lightboxImage.title || lightboxImage.target.name}
                    </Text>
                    <Text size="sm" className="text-gray-300">
                      {lightboxImage.target.catalogId || lightboxImage.target.type}
                      {lightboxImage.target.constellation && ` • ${lightboxImage.target.constellation}`}
                    </Text>
                    <Link
                      href={`/users/${lightboxImage.user.username}`}
                      className="no-underline"
                    >
                      <Text size="xs" className="text-gray-400 mt-1">
                        by {lightboxImage.user.name || lightboxImage.user.username}
                      </Text>
                    </Link>
                  </div>
                  <Group gap="xs">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-9 w-9 p-0"
                            onClick={() => handleDownload(lightboxImage)}
                          >
                            <IconDownload size={18} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Download</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-9 w-9 p-0"
                            onClick={() => {
                              navigator.clipboard.writeText(lightboxImage.url);
                            }}
                          >
                            <IconShare size={18} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Copy link</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={handleCloseLightbox}
                    >
                      <IconX size={18} />
                    </Button>
                  </Group>
                </div>

                {/* Image */}
                <img
                  src={lightboxImage.url}
                  alt={lightboxImage.title || lightboxImage.target.name}
                  className="max-w-[95vw] max-h-[95vh] w-auto h-auto object-contain block rounded-lg"
                />

                {/* Footer with description */}
                {lightboxImage.description && (
                  <div
                    className="absolute bottom-0 left-0 right-0 p-3"
                    style={{
                      background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                    }}
                  >
                    <Text size="sm" className="text-gray-300">
                      {lightboxImage.description}
                    </Text>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </Stack>
    </Container>
  );
}
