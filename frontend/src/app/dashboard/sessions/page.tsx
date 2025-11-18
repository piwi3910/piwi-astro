'use client';

import { useState } from 'react';
import {
  Container,
  Title,
  Button,
  Stack,
  Group,
  Card,
  Text,
  Badge,
  ActionIcon,
  Modal,
  TextInput,
  Textarea,
  Table,
  Select,
  NumberInput,
  Tabs,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconCalendar,
  IconList,
  IconTarget,
} from '@tabler/icons-react';

interface Target {
  catalogId: string | null;
  name: string;
  type: string;
  magnitude: number | null;
  constellation: string | null;
}

interface SessionTarget {
  id: string;
  targetId: string;
  priority: number;
  duration: number | null;
  notes: string | null;
  target: Target;
}

interface Session {
  id: string;
  date: string;
  location: string;
  conditions: string | null;
  notes: string | null;
  sessionTargets: SessionTarget[];
}

interface UserTarget {
  id: string;
  targetId: string;
  status: string;
  target: Target;
}

async function fetchSessions(): Promise<Session[]> {
  const response = await fetch('/api/sessions');
  if (!response.ok) throw new Error('Failed to fetch sessions');
  return response.json();
}

async function createSession(data: {
  date: string;
  location: string;
  conditions?: string;
  notes?: string;
}): Promise<Session> {
  const response = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create session');
  return response.json();
}

async function updateSession(id: string, data: Partial<Session>): Promise<Session> {
  const response = await fetch(`/api/sessions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update session');
  return response.json();
}

async function deleteSession(id: string): Promise<void> {
  const response = await fetch(`/api/sessions/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete session');
}

async function fetchUserTargets(): Promise<UserTarget[]> {
  const response = await fetch('/api/user-targets');
  if (!response.ok) throw new Error('Failed to fetch user targets');
  return response.json();
}

async function addTargetToSession(data: {
  sessionId: string;
  targetId: string;
  priority?: number;
  duration?: number;
  notes?: string;
}): Promise<SessionTarget> {
  const response = await fetch('/api/session-targets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to add target to session');
  return response.json();
}

async function removeTargetFromSession(id: string): Promise<void> {
  const response = await fetch(`/api/session-targets/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to remove target from session');
}

async function updateSessionTarget(
  id: string,
  data: { priority?: number; duration?: number; notes?: string }
): Promise<SessionTarget> {
  const response = await fetch(`/api/session-targets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update session target');
  return response.json();
}

export default function SessionsPage(): JSX.Element {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [editTargetModalOpen, setEditTargetModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editingSessionTarget, setEditingSessionTarget] = useState<SessionTarget | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const [sessionForm, setSessionForm] = useState({
    date: new Date(),
    location: '',
    conditions: '',
    notes: '',
  });

  const [targetForm, setTargetForm] = useState({
    targetId: '',
    priority: 0,
    duration: 0,
    notes: '',
  });

  const [editTargetForm, setEditTargetForm] = useState({
    priority: 0,
    duration: 0,
    notes: '',
  });

  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: fetchSessions,
  });

  const { data: userTargets } = useQuery({
    queryKey: ['user-targets'],
    queryFn: fetchUserTargets,
  });

  const createMutation = useMutation({
    mutationFn: createSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setSessionModalOpen(false);
      resetSessionForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Session> }) =>
      updateSession(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setSessionModalOpen(false);
      setEditingSession(null);
      resetSessionForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const addTargetMutation = useMutation({
    mutationFn: addTargetToSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setTargetModalOpen(false);
      resetTargetForm();
    },
  });

  const removeTargetMutation = useMutation({
    mutationFn: removeTargetFromSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const updateSessionTargetMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { priority?: number; duration?: number; notes?: string } }) =>
      updateSessionTarget(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setEditTargetModalOpen(false);
      setEditingSessionTarget(null);
    },
  });

  const resetSessionForm = (): void => {
    setSessionForm({
      date: new Date(),
      location: '',
      conditions: '',
      notes: '',
    });
  };

  const resetTargetForm = (): void => {
    setTargetForm({
      targetId: '',
      priority: 0,
      duration: 0,
      notes: '',
    });
  };

  const handleCreateSession = (): void => {
    createMutation.mutate({
      date: sessionForm.date.toISOString(),
      location: sessionForm.location,
      conditions: sessionForm.conditions || undefined,
      notes: sessionForm.notes || undefined,
    });
  };

  const handleUpdateSession = (): void => {
    if (editingSession) {
      updateMutation.mutate({
        id: editingSession.id,
        data: {
          date: sessionForm.date.toISOString(),
          location: sessionForm.location,
          conditions: sessionForm.conditions || undefined,
          notes: sessionForm.notes || undefined,
        },
      });
    }
  };

  const handleEditSession = (session: Session): void => {
    setEditingSession(session);
    setSessionForm({
      date: new Date(session.date),
      location: session.location,
      conditions: session.conditions || '',
      notes: session.notes || '',
    });
    setSessionModalOpen(true);
  };

  const handleAddTarget = (): void => {
    if (selectedSession && targetForm.targetId) {
      addTargetMutation.mutate({
        sessionId: selectedSession,
        targetId: targetForm.targetId,
        priority: targetForm.priority,
        duration: targetForm.duration || undefined,
        notes: targetForm.notes || undefined,
      });
    }
  };

  const handleOpenTargetModal = (sessionId: string): void => {
    setSelectedSession(sessionId);
    setTargetModalOpen(true);
  };

  const handleEditSessionTarget = (sessionTarget: SessionTarget): void => {
    setEditingSessionTarget(sessionTarget);
    setEditTargetForm({
      priority: sessionTarget.priority,
      duration: sessionTarget.duration || 0,
      notes: sessionTarget.notes || '',
    });
    setEditTargetModalOpen(true);
  };

  const handleUpdateSessionTarget = (): void => {
    if (editingSessionTarget) {
      updateSessionTargetMutation.mutate({
        id: editingSessionTarget.id,
        data: {
          priority: editTargetForm.priority,
          duration: editTargetForm.duration || undefined,
          notes: editTargetForm.notes || undefined,
        },
      });
    }
  };

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={1}>Imaging Sessions</Title>
          <Group>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => {
                setEditingSession(null);
                resetSessionForm();
                setSessionModalOpen(true);
              }}
            >
              New Session
            </Button>
          </Group>
        </Group>

        <Tabs value={viewMode} onChange={(val) => setViewMode(val as 'list' | 'calendar')}>
          <Tabs.List>
            <Tabs.Tab value="list" leftSection={<IconList size={16} />}>
              List View
            </Tabs.Tab>
            <Tabs.Tab value="calendar" leftSection={<IconCalendar size={16} />}>
              Calendar View
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="list" pt="md">
            {sessions && sessions.length > 0 ? (
              <Stack gap="md">
                {sessions.map((session) => (
                  <Card key={session.id} shadow="sm" padding="lg" withBorder>
                    <Stack gap="sm">
                      <Group justify="space-between">
                        <div>
                          <Text fw={600} size="lg">
                            {new Date(session.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </Text>
                          <Text size="sm" c="dimmed">
                            {new Date(session.date).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </div>
                        <Group gap="xs">
                          <ActionIcon
                            variant="subtle"
                            onClick={() => handleEditSession(session)}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => deleteMutation.mutate(session.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Group>

                      <Group gap="lg">
                        <Text size="sm">
                          <strong>Location:</strong> {session.location}
                        </Text>
                        {session.conditions && (
                          <Text size="sm">
                            <strong>Conditions:</strong> {session.conditions}
                          </Text>
                        )}
                      </Group>

                      {session.notes && (
                        <Text size="sm" c="dimmed">
                          {session.notes}
                        </Text>
                      )}

                      <div>
                        <Group justify="space-between" mb="xs">
                          <Text size="sm" fw={500}>
                            Targets ({session.sessionTargets.length})
                          </Text>
                          <Button
                            size="xs"
                            variant="light"
                            leftSection={<IconTarget size={14} />}
                            onClick={() => handleOpenTargetModal(session.id)}
                          >
                            Add Target
                          </Button>
                        </Group>

                        {session.sessionTargets.length > 0 ? (
                          <Table>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>Target</Table.Th>
                                <Table.Th>Type</Table.Th>
                                <Table.Th>Priority</Table.Th>
                                <Table.Th>Duration</Table.Th>
                                <Table.Th>Actions</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {session.sessionTargets.map((st) => (
                                <Table.Tr key={st.id}>
                                  <Table.Td>
                                    <div>
                                      <Text size="sm" fw={500}>
                                        {st.target.name}
                                      </Text>
                                      {st.target.catalogId && (
                                        <Text size="xs" c="dimmed">
                                          {st.target.catalogId}
                                        </Text>
                                      )}
                                    </div>
                                  </Table.Td>
                                  <Table.Td>
                                    <Badge size="sm" variant="light">
                                      {st.target.type}
                                    </Badge>
                                  </Table.Td>
                                  <Table.Td>{st.priority}</Table.Td>
                                  <Table.Td>
                                    {st.duration ? `${st.duration} min` : '-'}
                                  </Table.Td>
                                  <Table.Td>
                                    <Group gap="xs">
                                      <ActionIcon
                                        variant="subtle"
                                        size="sm"
                                        onClick={() => handleEditSessionTarget(st)}
                                      >
                                        <IconEdit size={14} />
                                      </ActionIcon>
                                      <ActionIcon
                                        variant="subtle"
                                        color="red"
                                        size="sm"
                                        onClick={() => removeTargetMutation.mutate(st.id)}
                                      >
                                        <IconTrash size={14} />
                                      </ActionIcon>
                                    </Group>
                                  </Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                        ) : (
                          <Text size="sm" c="dimmed" ta="center" py="md">
                            No targets added yet
                          </Text>
                        )}
                      </div>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                No sessions planned yet. Create your first imaging session!
              </Text>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="calendar" pt="md">
            <Text c="dimmed" ta="center" py="xl">
              Calendar view coming soon
            </Text>
          </Tabs.Panel>
        </Tabs>

        {/* Session Modal */}
        <Modal
          opened={sessionModalOpen}
          onClose={() => {
            setSessionModalOpen(false);
            setEditingSession(null);
            resetSessionForm();
          }}
          title={editingSession ? 'Edit Session' : 'New Session'}
          size="md"
        >
          <Stack gap="md">
            <DateTimePicker
              label="Date & Time"
              value={sessionForm.date}
              onChange={(val) =>
                val && setSessionForm({ ...sessionForm, date: val })
              }
              required
            />
            <TextInput
              label="Location"
              placeholder="Backyard, Dark Sky Site, etc."
              value={sessionForm.location}
              onChange={(e) =>
                setSessionForm({ ...sessionForm, location: e.target.value })
              }
              required
            />
            <TextInput
              label="Conditions"
              placeholder="Clear skies, no moon, etc."
              value={sessionForm.conditions}
              onChange={(e) =>
                setSessionForm({ ...sessionForm, conditions: e.target.value })
              }
            />
            <Textarea
              label="Notes"
              placeholder="Session notes..."
              value={sessionForm.notes}
              onChange={(e) =>
                setSessionForm({ ...sessionForm, notes: e.target.value })
              }
              minRows={3}
            />
            <Group justify="flex-end">
              <Button
                variant="subtle"
                onClick={() => {
                  setSessionModalOpen(false);
                  setEditingSession(null);
                  resetSessionForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={editingSession ? handleUpdateSession : handleCreateSession}
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingSession ? 'Save' : 'Create'}
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Add Target Modal */}
        <Modal
          opened={targetModalOpen}
          onClose={() => {
            setTargetModalOpen(false);
            setSelectedSession(null);
            resetTargetForm();
          }}
          title="Add Target to Session"
          size="md"
        >
          <Stack gap="md">
            <Select
              label="Target"
              placeholder="Select a target"
              data={
                userTargets?.map((ut) => ({
                  value: ut.targetId,
                  label: `${ut.target.name}${
                    ut.target.catalogId ? ` (${ut.target.catalogId})` : ''
                  }`,
                })) || []
              }
              value={targetForm.targetId}
              onChange={(val) =>
                setTargetForm({ ...targetForm, targetId: val || '' })
              }
              searchable
              required
            />
            <NumberInput
              label="Priority"
              description="Higher priority targets are listed first"
              value={targetForm.priority}
              onChange={(val) =>
                setTargetForm({ ...targetForm, priority: Number(val) })
              }
              min={0}
            />
            <NumberInput
              label="Duration (minutes)"
              description="Planned imaging time"
              value={targetForm.duration}
              onChange={(val) =>
                setTargetForm({ ...targetForm, duration: Number(val) })
              }
              min={0}
            />
            <Textarea
              label="Notes"
              placeholder="Target-specific notes for this session..."
              value={targetForm.notes}
              onChange={(e) =>
                setTargetForm({ ...targetForm, notes: e.target.value })
              }
              minRows={2}
            />
            <Group justify="flex-end">
              <Button
                variant="subtle"
                onClick={() => {
                  setTargetModalOpen(false);
                  setSelectedSession(null);
                  resetTargetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddTarget}
                loading={addTargetMutation.isPending}
                disabled={!targetForm.targetId}
              >
                Add Target
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Edit Session Target Modal */}
        <Modal
          opened={editTargetModalOpen}
          onClose={() => {
            setEditTargetModalOpen(false);
            setEditingSessionTarget(null);
          }}
          title="Edit Session Target"
          size="md"
        >
          <Stack gap="md">
            <Text size="sm" fw={600}>
              Target: {editingSessionTarget?.target.name}
              {editingSessionTarget?.target.catalogId && (
                <Text size="xs" c="dimmed" component="span" ml="xs">
                  ({editingSessionTarget.target.catalogId})
                </Text>
              )}
            </Text>

            <NumberInput
              label="Priority"
              description="Higher priority targets are listed first"
              value={editTargetForm.priority}
              onChange={(val) =>
                setEditTargetForm({ ...editTargetForm, priority: Number(val) })
              }
              min={0}
            />
            <NumberInput
              label="Duration (minutes)"
              description="Planned imaging time"
              value={editTargetForm.duration}
              onChange={(val) =>
                setEditTargetForm({ ...editTargetForm, duration: Number(val) })
              }
              min={0}
            />
            <Textarea
              label="Notes"
              placeholder="Target-specific notes for this session..."
              value={editTargetForm.notes}
              onChange={(e) =>
                setEditTargetForm({ ...editTargetForm, notes: e.target.value })
              }
              minRows={2}
            />
            <Group justify="flex-end">
              <Button
                variant="subtle"
                onClick={() => {
                  setEditTargetModalOpen(false);
                  setEditingSessionTarget(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateSessionTarget}
                loading={updateSessionTargetMutation.isPending}
              >
                Save Changes
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}
