'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Tabs,
  Table,
  Badge,
  Group,
  ActionIcon,
  Text,
  Stack,
  Select,
  Button,
  Modal,
  Textarea,
  Rating,
  Image,
  Box,
  Tooltip,
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { IconEdit, IconTrash, IconStar, IconCalendarSearch, IconArrowUp } from '@tabler/icons-react';
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

export default function WishlistPage(): JSX.Element {
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
      PROCESSED: 'grape',
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
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Title order={1}>My Targets</Title>

        <Tabs value={activeTab} onChange={(val) => setActiveTab(val || 'WISHLIST')}>
          <Tabs.List>
            <Tabs.Tab value="WISHLIST">Wishlist</Tabs.Tab>
            <Tabs.Tab value="PLANNED">Planned</Tabs.Tab>
            <Tabs.Tab value="SHOT">Shot</Tabs.Tab>
            <Tabs.Tab value="PROCESSED">Processed</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value={activeTab} pt="md">
            {targets && targets.length > 0 ? (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 70 }}>Image</Table.Th>
                    <Table.Th>Catalog ID</Table.Th>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Rating</Table.Th>
                    <Table.Th>Times Shot</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {targets.map((ut) => (
                    <Table.Tr key={ut.id}>
                      <Table.Td>
                        <Box style={{ width: 60, height: 60 }}>
                          <Image
                            src={getTargetImageUrl(ut.target)}
                            width={60}
                            height={60}
                            alt={ut.target.name}
                            radius="sm"
                            fallbackSrc="https://placehold.co/60x60/1a1b1e/white?text=No+Image"
                          />
                        </Box>
                      </Table.Td>
                      <Table.Td>{ut.target.catalogId || '-'}</Table.Td>
                      <Table.Td>{ut.target.name}</Table.Td>
                      <Table.Td>{ut.target.type}</Table.Td>
                      <Table.Td>
                        <Badge color={getStatusColor(ut.status)} variant="light">
                          {ut.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {ut.rating ? (
                          <Group gap={4}>
                            <IconStar size={16} fill="gold" color="gold" />
                            <Text size="sm">{ut.rating}</Text>
                          </Group>
                        ) : (
                          '-'
                        )}
                      </Table.Td>
                      <Table.Td>{ut.timesShot}</Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          {!ut.target.isDynamic && (
                            <Tooltip label="Find best observation date">
                              <ActionIcon
                                variant="subtle"
                                color="teal"
                                onClick={() => handleFindBestDate(ut)}
                              >
                                <IconCalendarSearch size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                          <Tooltip label="Edit target">
                            <ActionIcon variant="subtle" onClick={() => handleEdit(ut)}>
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Remove from list">
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              onClick={() => deleteMutation.mutate(ut.id)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                No targets in {activeTab.toLowerCase()} yet.
              </Text>
            )}
          </Tabs.Panel>
        </Tabs>

        <Modal
          opened={editingId !== null}
          onClose={() => setEditingId(null)}
          title="Edit Target"
        >
          <Stack gap="md">
            <Select
              label="Status"
              data={['WISHLIST', 'PLANNED', 'SHOT', 'PROCESSED']}
              value={editData.status}
              onChange={(val) => setEditData({ ...editData, status: val || '' })}
            />
            <div>
              <Text size="sm" fw={500} mb="xs">
                Rating
              </Text>
              <Rating
                value={editData.rating}
                onChange={(val) => setEditData({ ...editData, rating: val })}
              />
            </div>
            <Textarea
              label="Notes"
              value={editData.notes}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
            />
            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setEditingId(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave} loading={updateMutation.isPending}>
                Save
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Scroll to top button */}
        <ActionIcon
          variant="filled"
          color="blue"
          size="xl"
          radius="xl"
          onClick={scrollToTop}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            opacity: showScrollTop ? 1 : 0,
            visibility: showScrollTop ? 'visible' : 'hidden',
            transition: 'opacity 0.3s, visibility 0.3s',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
          aria-label="Scroll to top"
        >
          <IconArrowUp size={24} />
        </ActionIcon>
      </Stack>
    </Container>
  );
}
