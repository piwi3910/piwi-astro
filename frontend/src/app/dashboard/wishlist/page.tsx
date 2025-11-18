'use client';

import { useState } from 'react';
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
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IconEdit, IconTrash, IconStar } from '@tabler/icons-react';

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
  };
}

async function fetchUserTargets(status?: string): Promise<UserTarget[]> {
  const params = status ? `?status=${status}` : '';
  const response = await fetch(`/api/user-targets${params}`);
  if (!response.ok) throw new Error('Failed to fetch targets');
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

  const queryClient = useQueryClient();

  const { data: targets, isLoading } = useQuery({
    queryKey: ['user-targets', activeTab],
    queryFn: () => fetchUserTargets(activeTab),
  });

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
                          <ActionIcon variant="subtle" onClick={() => handleEdit(ut)}>
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => deleteMutation.mutate(ut.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
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
      </Stack>
    </Container>
  );
}
