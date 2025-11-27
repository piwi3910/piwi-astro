'use client';

import { useState } from 'react';
import { Container } from '@/components/ui/container';
import { Title } from '@/components/ui/title';
import { Button } from '@/components/ui/button';
import { Stack } from '@/components/ui/stack';
import { Group } from '@/components/ui/group';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { TextInput } from '@/components/ui/text-input';
import { TextareaField } from '@/components/ui/textarea-field';
import { SelectField } from '@/components/ui/select-field';
import { Loader } from '@/components/ui/loader';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Autocomplete } from '@/components/ui/autocomplete';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IconEdit,
  IconTrash,
  IconUpload,
  IconEye,
  IconEyeOff,
  IconLink,
  IconStar,
  IconZoomIn,
  IconX,
  IconChevronDown,
  IconDownload,
  IconShare,
} from '@tabler/icons-react';
import Link from 'next/link';
import Image from 'next/image';

interface Target {
  id: string;
  catalogId: string | null;
  name: string;
  type: string;
}

async function fetchTargets(search: string): Promise<Target[]> {
  if (!search || search.length < 2) return [];
  const response = await fetch(`/api/targets?search=${encodeURIComponent(search)}&limit=20`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.targets || data;
}

interface ImageUpload {
  id: string;
  storageKey: string;
  url: string;
  visibility: string;
  title: string | null;
  description: string | null;
  featured: boolean;
  viewCount: number;
  exposureTimeSec: number | null;
  totalIntegrationMin: number | null;
  filter: string | null;
  isoGain: string | null;
  uploadedAt: string;
  target: Target;
}

async function fetchImages(): Promise<ImageUpload[]> {
  const response = await fetch('/api/images');
  if (!response.ok) throw new Error('Failed to fetch images');
  return response.json();
}

async function updateImage(id: string, data: Partial<ImageUpload>): Promise<ImageUpload> {
  const response = await fetch(`/api/images/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update image');
  return response.json();
}

async function deleteImage(id: string): Promise<void> {
  const response = await fetch(`/api/images/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete image');
}

export default function ImagesPage() {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<ImageUpload | null>(null);
  const [lightboxImage, setLightboxImage] = useState<ImageUpload | null>(null);
  const [targetSearch, setTargetSearch] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    visibility: 'PRIVATE',
    title: '',
    description: '',
    featured: false,
  });

  const queryClient = useQueryClient();

  const { data: images, isLoading } = useQuery({
    queryKey: ['images'],
    queryFn: fetchImages,
  });

  const { data: searchedTargets } = useQuery({
    queryKey: ['targets-search', targetSearch],
    queryFn: () => fetchTargets(targetSearch),
    enabled: targetSearch.length >= 2,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ImageUpload> }) =>
      updateImage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['images'] });
      setEditModalOpen(false);
      setEditingImage(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['images'] });
    },
  });

  const handleEdit = (image: ImageUpload): void => {
    setEditingImage(image);
    setEditForm({
      visibility: image.visibility,
      title: image.title || '',
      description: image.description || '',
      featured: image.featured,
    });
    // Set current target
    setSelectedTargetId(image.target.id);
    setTargetSearch(image.target.catalogId || image.target.name);
    setEditModalOpen(true);
  };

  const handleUpdate = (): void => {
    if (!editingImage) return;

    // Only include targetId if it was changed
    const targetChanged = selectedTargetId && selectedTargetId !== editingImage.target.id;

    updateMutation.mutate({
      id: editingImage.id,
      data: {
        visibility: editForm.visibility as ImageUpload['visibility'],
        title: editForm.title || undefined,
        description: editForm.description || undefined,
        featured: editForm.featured,
        ...(targetChanged && { targetId: selectedTargetId }),
      },
    });
  };

  const getVisibilityColor = (visibility: string): string => {
    const colors: Record<string, string> = {
      PUBLIC: 'bg-green-500/20 text-green-500 border-green-500/30',
      PRIVATE: 'bg-red-500/20 text-red-500 border-red-500/30',
      UNLISTED: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
    };
    return colors[visibility] || 'bg-gray-500/20 text-gray-500 border-gray-500/30';
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'PUBLIC':
        return <IconEye size={12} />;
      case 'PRIVATE':
        return <IconEyeOff size={12} />;
      case 'UNLISTED':
        return <IconLink size={12} />;
      default:
        return <IconEyeOff size={12} />;
    }
  };

  const handleVisibilityChange = (imageId: string, newVisibility: string) => {
    updateMutation.mutate({
      id: imageId,
      data: { visibility: newVisibility as ImageUpload['visibility'] },
    });
  };

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
      <Container size="xl" className="py-12">
        <Stack align="center">
          <Loader />
          <Text>Loading images...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" className="py-12">
      <Stack gap="lg">
        <Group justify="between">
          <Title order={1}>My Images</Title>
          <Link href="/dashboard/images/upload">
            <Button>
              <IconUpload size={16} className="mr-2" />
              Upload Image
            </Button>
          </Link>
        </Group>

        {images && images.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <div key={image.id}>
                <Card className="shadow-sm border">
                  <div
                    className="relative cursor-pointer overflow-hidden"
                    onClick={() => setLightboxImage(image)}
                  >
                    <div className="relative h-[200px] w-full">
                      <Image
                        src={image.url}
                        alt={image.title || image.target.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    </div>
                    {/* Clickable overlay with zoom icon */}
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-transparent transition-colors duration-200 hover:bg-black/40"
                      onMouseEnter={(e) => {
                        const icon = e.currentTarget.querySelector('.zoom-icon') as HTMLElement;
                        if (icon) icon.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        const icon = e.currentTarget.querySelector('.zoom-icon') as HTMLElement;
                        if (icon) icon.style.opacity = '0';
                      }}
                    >
                      <div
                        className="zoom-icon flex items-center justify-center rounded-full bg-white/90 p-3 opacity-0 transition-opacity duration-200"
                      >
                        <IconZoomIn size={24} color="#333" />
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-3">
                    <Stack gap="xs">
                      <Group justify="between" align="start">
                        <div className="flex-1 min-w-0">
                          <Text className="font-semibold text-sm truncate">
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

                      {image.description && (
                        <Text className="text-xs text-muted-foreground line-clamp-2">
                          {image.description}
                        </Text>
                      )}

                      {(image.exposureTimeSec || image.totalIntegrationMin || image.filter) && (
                        <Text className="text-xs text-muted-foreground">
                          {image.exposureTimeSec && `${image.exposureTimeSec}s`}
                          {image.totalIntegrationMin && ` • ${image.totalIntegrationMin.toFixed(1)} min total`}
                          {image.filter && ` • ${image.filter}`}
                          {image.isoGain && ` • ${image.isoGain}`}
                        </Text>
                      )}

                      <Group gap="xs" justify="between">
                        <Group gap="xs">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Badge
                                      variant="outline"
                                      className={`cursor-pointer text-xs ${getVisibilityColor(image.visibility)}`}
                                    >
                                      <span className="mr-1">{getVisibilityIcon(image.visibility)}</span>
                                      {image.visibility}
                                      <IconChevronDown size={10} className="ml-1" />
                                    </Badge>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="w-[140px]">
                                    <DropdownMenuLabel>Change visibility</DropdownMenuLabel>
                                    <DropdownMenuItem
                                      onClick={() => handleVisibilityChange(image.id, 'PRIVATE')}
                                      disabled={image.visibility === 'PRIVATE'}
                                    >
                                      <IconEyeOff size={14} className="mr-2" />
                                      Private
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleVisibilityChange(image.id, 'UNLISTED')}
                                      disabled={image.visibility === 'UNLISTED'}
                                    >
                                      <IconLink size={14} className="mr-2" />
                                      Unlisted
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleVisibilityChange(image.id, 'PUBLIC')}
                                      disabled={image.visibility === 'PUBLIC'}
                                    >
                                      <IconEye size={14} className="mr-2" />
                                      Public
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Click to change visibility</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {image.viewCount > 0 && (
                            <div className="flex items-center gap-1">
                              <IconEye size={12} />
                              <Text className="text-xs">{image.viewCount}</Text>
                            </div>
                          )}
                        </Group>
                        <Group gap="xs">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(image)}>
                            <IconEdit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(image.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <IconTrash size={16} />
                          </Button>
                        </Group>
                      </Group>
                    </Stack>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <Text className="text-muted-foreground text-center py-12">
            No images uploaded yet. Upload your first astrophotography image!
          </Text>
        )}

        {/* Edit Modal */}
        <Dialog
          open={editModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              setEditModalOpen(false);
              setEditingImage(null);
              setTargetSearch('');
              setSelectedTargetId(null);
            }
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Image</DialogTitle>
            </DialogHeader>
            <Stack gap="md" className="py-4">
              <SelectField
                label="Visibility"
                data={[
                  { value: 'PRIVATE', label: 'Private' },
                  { value: 'PUBLIC', label: 'Public' },
                  { value: 'UNLISTED', label: 'Unlisted' },
                ]}
                value={editForm.visibility}
                onChange={(val) =>
                  setEditForm({ ...editForm, visibility: val || 'PRIVATE' })
                }
              />

              <div className="flex items-center justify-between rounded-lg border border-input bg-input p-4">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium text-foreground">Featured Image</label>
                  <p className="text-sm text-muted-foreground">Display this image prominently in your profile</p>
                </div>
                <Switch
                  checked={editForm.featured}
                  onCheckedChange={(checked) =>
                    setEditForm({ ...editForm, featured: checked })
                  }
                />
              </div>

              <Autocomplete
                label="Target"
                description="Change the associated astronomical target"
                placeholder="Search for a target..."
                data={
                  searchedTargets?.map((t) => ({
                    value: t.id,
                    label: `${t.catalogId || t.name} - ${t.type}`,
                  })) || []
                }
                value={targetSearch}
                onChange={setTargetSearch}
                onOptionSubmit={setSelectedTargetId}
              />

              <TextInput
                label="Title"
                placeholder="Optional title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />

              <TextareaField
                label="Description"
                placeholder="Optional description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
              />
            </Stack>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setEditModalOpen(false);
                  setEditingImage(null);
                  setTargetSearch('');
                  setSelectedTargetId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Lightbox Modal for full-size image viewing */}
        <Dialog
          open={!!lightboxImage}
          onOpenChange={(open) => !open && setLightboxImage(null)}
        >
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
                    <Text className="text-lg font-semibold text-white">
                      {lightboxImage.title || lightboxImage.target.name}
                    </Text>
                    <Text className="text-sm text-gray-300">
                      {lightboxImage.target.catalogId || lightboxImage.target.name}
                      {lightboxImage.exposureTimeSec && ` • ${lightboxImage.exposureTimeSec}s`}
                      {lightboxImage.totalIntegrationMin && ` • ${lightboxImage.totalIntegrationMin.toFixed(1)} min total`}
                      {lightboxImage.filter && ` • ${lightboxImage.filter}`}
                    </Text>
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
                      onClick={() => setLightboxImage(null)}
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
                    <Text className="text-sm text-gray-300">
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
