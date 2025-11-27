'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { IconEdit, IconTrash, IconStar, IconCalendarSearch, IconArrowUp } from '@tabler/icons-react';
import Image from 'next/image';

import { Container } from '@/components/ui/container';
import { Title } from '@/components/ui/title';
import { Text } from '@/components/ui/text';
import { Stack } from '@/components/ui/stack';
import { Group } from '@/components/ui/group';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { Box } from '@/components/ui/box';
import { calculateBestObservationDate } from '@/utils/visibility';

interface UserTarget {
  id: string;
  targetId: string;
  status: string;
  rating: number | null;
  notes: string | null;
  firstShotAt: string | null;
  lastShotAt: string | null;
  timesShot: number;
  target: {
    catalogId: string | null;
    name: string;
    type: string;
    magnitude: number | null;
    constellation: string | null;
    raDeg: number;
    decDeg: number;
    sizeMajorArcmin: number | null;
    sizeMinorArcmin: number | null;
    thumbnailUrl: string | null;
    previewImageUrl: string | null;
    isDynamic: boolean;
    solarSystemBody: string | null;
  };
}

// Get target image URL (similar to targets page logic)
function getTargetImageUrl(target: UserTarget['target']): string {
  // Use stored thumbnail if available
  if (target.thumbnailUrl) return target.thumbnailUrl;

  let externalUrl: string;

  if (target.type === 'Comet') {
    externalUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Comet_Hale-Bopp_1995O1.jpg/150px-Comet_Hale-Bopp_1995O1.jpg';
  } else if (target.solarSystemBody) {
    const planetImages: Record<string, string> = {
      'Mercury': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Mercury_in_color_-_Prockter07-edit1.jpg/150px-Mercury_in_color_-_Prockter07-edit1.jpg',
      'Venus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Venus-real_color.jpg/150px-Venus-real_color.jpg',
      'Mars': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/OSIRIS_Mars_true_color.jpg/150px-OSIRIS_Mars_true_color.jpg',
      'Jupiter': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Jupiter_New_Horizons.jpg/150px-Jupiter_New_Horizons.jpg',
      'Saturn': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Saturn_during_Equinox.jpg/150px-Saturn_during_Equinox.jpg',
      'Uranus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Uranus_as_seen_by_NASA%27s_Voyager_2_%28remastered%29_-_JPEG_converted.jpg/150px-Uranus_as_seen_by_NASA%27s_Voyager_2_%28remastered%29_-_JPEG_converted.jpg',
      'Neptune': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Neptune_-_Voyager_2_%2829347980845%29_flatten_crop.jpg/150px-Neptune_-_Voyager_2_%2829347980845%29_flatten_crop.jpg',
      'Moon': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/FullMoon2010.jpg/150px-FullMoon2010.jpg',
    };
    externalUrl = planetImages[target.solarSystemBody] || 'https://placehold.co/60x60/1a1b1e/white?text=?';
  } else {
    // Deep-sky objects - use HiPS2FITS
    let fovDeg: number;
    if (target.sizeMajorArcmin) {
      const targetFov = (target.sizeMajorArcmin / 60) * 1.5;
      fovDeg = Math.min(Math.max(targetFov, 0.05), 3);
    } else {
      fovDeg = 0.5;
    }

    const params = new URLSearchParams({
      hips: 'CDS/P/DSS2/color',
      ra: target.raDeg.toString(),
      dec: target.decDeg.toString(),
      width: '60',
      height: '60',
      fov: fovDeg.toString(),
      format: 'jpg',
    });

    externalUrl = `https://alasky.u-strasbg.fr/hips-image-services/hips2fits?${params}`;
  }

  // Proxy through image cache API
  return `/api/image-proxy?url=${encodeURIComponent(externalUrl)}`;
}

interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  isFavorite: boolean;
}

async function fetchUserTargets(status?: string): Promise<UserTarget[]> {
  const params = status ? `?status=${status}` : '';
  const response = await fetch(`/api/user-targets${params}`);
  if (!response.ok) throw new Error('Failed to fetch targets');
  return response.json();
}

async function fetchLocations(): Promise<Location[]> {
  const response = await fetch('/api/locations');
  if (!response.ok) throw new Error('Failed to fetch locations');
  return response.json();
}

async function updateUserTarget(id: string, data: Partial<UserTarget>): Promise<UserTarget> {
  const response = await fetch(`/api/user-targets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update target');
  return response.json();
}

async function deleteUserTarget(id: string): Promise<void> {
  const response = await fetch(`/api/user-targets/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete target');
}

// Custom Rating Component
function Rating({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="transition-colors hover:scale-110"
        >
          <IconStar
            size={20}
            fill={star <= value ? 'gold' : 'transparent'}
            color={star <= value ? 'gold' : '#8b949e'}
          />
        </button>
      ))}
    </div>
  );
}

export default function WishlistPage() {
  const [activeTab, setActiveTab] = useState<string>('WISHLIST');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ status: '', rating: 0, notes: '' });
  const [showScrollTop, setShowScrollTop] = useState(false);

  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: targets, isLoading } = useQuery({
    queryKey: ['user-targets', activeTab],
    queryFn: () => fetchUserTargets(activeTab),
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
  });

  // Get favorite or first location for visibility calculations
  const defaultLocation = locations?.find((loc) => loc.isFavorite) || locations?.[0];

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UserTarget> }) =>
      updateUserTarget(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-targets'] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUserTarget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-targets'] });
    },
  });

  // Track scroll position to show/hide scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEdit = (userTarget: UserTarget): void => {
    setEditingId(userTarget.id);
    setEditData({
      status: userTarget.status,
      rating: userTarget.rating || 0,
      notes: userTarget.notes || '',
    });
  };

  const handleSave = (): void => {
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        data: {
          status: editData.status as UserTarget['status'],
          rating: editData.rating || undefined,
          notes: editData.notes || undefined,
        },
      });
    }
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      WISHLIST: 'blue',
      PLANNED: 'cyan',
      SHOT: 'green',
      PROCESSED: 'purple',
    };
    return colors[status] || 'gray';
  };

  const handleFindBestDate = (userTarget: UserTarget): void => {
    // Don't calculate for dynamic objects (planets, comets, moon)
    if (userTarget.target.isDynamic) {
      return;
    }

    // Pass location for visibility check (if target is still well-visible today)
    const locationForCalc = defaultLocation
      ? { latitude: defaultLocation.latitude, longitude: defaultLocation.longitude }
      : undefined;

    const bestDate = calculateBestObservationDate(
      { raDeg: userTarget.target.raDeg, decDeg: userTarget.target.decDeg },
      new Date(),
      locationForCalc
    );

    // Navigate to targets page with date and search filter
    const searchTerm = userTarget.target.catalogId || userTarget.target.name;
    const dateStr = bestDate.toISOString().split('T')[0]; // YYYY-MM-DD format

    router.push(`/targets?date=${dateStr}&search=${encodeURIComponent(searchTerm)}`);
  };

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  return (
    <Container size="xl" className="py-8">
      <Stack gap="lg">
        <Title order={1}>My Targets</Title>

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val || 'WISHLIST')}>
          <TabsList>
            <TabsTrigger value="WISHLIST">Wishlist</TabsTrigger>
            <TabsTrigger value="PLANNED">Planned</TabsTrigger>
            <TabsTrigger value="SHOT">Shot</TabsTrigger>
            <TabsTrigger value="PROCESSED">Processed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="pt-4">
            {targets && targets.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ width: 70 }}>Image</TableHead>
                    <TableHead>Catalog ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Times Shot</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {targets.map((ut) => (
                    <TableRow key={ut.id}>
                      <TableCell>
                        <Box style={{ width: 60, height: 60 }}>
                          <Image
                            src={getTargetImageUrl(ut.target)}
                            width={60}
                            height={60}
                            alt={ut.target.name}
                            className="rounded-sm object-cover"
                            unoptimized
                          />
                        </Box>
                      </TableCell>
                      <TableCell>{ut.target.catalogId || '-'}</TableCell>
                      <TableCell>{ut.target.name}</TableCell>
                      <TableCell>{ut.target.type}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`bg-${getStatusColor(ut.status)}-500/20 text-${getStatusColor(ut.status)}-400 border-${getStatusColor(ut.status)}-500/30`}>
                          {ut.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {ut.rating ? (
                          <Group gap="md">
                            <IconStar size={16} fill="gold" color="gold" />
                            <Text size="sm">{ut.rating}</Text>
                          </Group>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{ut.timesShot}</TableCell>
                      <TableCell>
                        <Group gap="xs">
                          {!ut.target.isDynamic && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="text-teal-400 hover:text-teal-300"
                                  onClick={() => handleFindBestDate(ut)}
                                >
                                  <IconCalendarSearch size={16} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Find best observation date</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleEdit(ut)}
                              >
                                <IconEdit size={16} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit target</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-red-400 hover:text-red-300"
                                onClick={() => deleteMutation.mutate(ut.id)}
                              >
                                <IconTrash size={16} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remove from list</TooltipContent>
                          </Tooltip>
                        </Group>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Text className="text-muted-foreground text-center py-8">
                No targets in {activeTab.toLowerCase()} yet.
              </Text>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={editingId !== null} onOpenChange={(open) => !open && setEditingId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Target</DialogTitle>
            </DialogHeader>
            <Stack gap="md">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editData.status}
                  onValueChange={(val) => setEditData({ ...editData, status: val || '' })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WISHLIST">WISHLIST</SelectItem>
                    <SelectItem value="PLANNED">PLANNED</SelectItem>
                    <SelectItem value="SHOT">SHOT</SelectItem>
                    <SelectItem value="PROCESSED">PROCESSED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Rating</Label>
                <Rating
                  value={editData.rating}
                  onChange={(val) => setEditData({ ...editData, rating: val })}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  placeholder="Add notes..."
                />
              </div>
            </Stack>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditingId(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Scroll to top button */}
        <Button
          variant="default"
          size="icon-lg"
          className="fixed bottom-6 right-6 rounded-full shadow-lg transition-opacity duration-300 z-1000"
          onClick={scrollToTop}
          style={{
            opacity: showScrollTop ? 1 : 0,
            visibility: showScrollTop ? 'visible' : 'hidden',
          }}
          aria-label="Scroll to top"
        >
          <IconArrowUp size={24} />
        </Button>
      </Stack>
    </Container>
  );
}
