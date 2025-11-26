'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
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
  Select,
  Tabs,
  Paper,
  SimpleGrid,
  Box,
  Tooltip,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IconEdit,
  IconTrash,
  IconCalendar,
  IconList,
  IconChevronLeft,
  IconChevronRight,
  IconArrowUp,
} from '@tabler/icons-react';

interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

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
  target: Target;
}

interface Session {
  id: string;
  name: string;
  date: string;
  locationName: string | null;
  latitude: number;
  longitude: number;
  notes: string | null;
  sessionTargets: SessionTarget[];
}

async function fetchSessions(): Promise<Session[]> {
  const response = await fetch('/api/sessions');
  if (!response.ok) throw new Error('Failed to fetch sessions');
  return response.json();
}

async function fetchLocations(): Promise<Location[]> {
  const response = await fetch('/api/locations');
  if (!response.ok) throw new Error('Failed to fetch locations');
  return response.json();
}

async function createSession(data: {
  name: string;
  date: string;
  locationName?: string;
  latitude: number;
  longitude: number;
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

export default function SessionsPage(): JSX.Element {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [sessionForm, setSessionForm] = useState({
    name: '',
    date: new Date(),
    locationId: '',
    notes: '',
  });

  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: fetchSessions,
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
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

  // Calendar state
  const [calendarDate, setCalendarDate] = useState(new Date());
  const sessionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Get calendar data
  const calendarData = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);

    // Day of week for first day, adjusted for Monday start (0 = Monday, 6 = Sunday)
    const dayOfWeek = firstDay.getDay();
    const startDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    // Total days in month
    const daysInMonth = lastDay.getDate();

    // Build array of days including padding for previous month
    const days: { date: Date; isCurrentMonth: boolean; sessions: Session[] }[] = [];

    // Add days from previous month to fill the first week
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({ date, isCurrentMonth: false, sessions: [] });
    }

    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({ date, isCurrentMonth: true, sessions: [] });
    }

    // Add days from next month to complete the grid (6 rows = 42 days)
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({ date, isCurrentMonth: false, sessions: [] });
    }

    // Map sessions to days
    if (sessions) {
      sessions.forEach((session) => {
        const sessionDate = new Date(session.date);
        const dayIndex = days.findIndex(
          (d) =>
            d.date.getFullYear() === sessionDate.getFullYear() &&
            d.date.getMonth() === sessionDate.getMonth() &&
            d.date.getDate() === sessionDate.getDate()
        );
        if (dayIndex !== -1) {
          days[dayIndex].sessions.push(session);
        }
      });
    }

    return { days, year, month };
  }, [calendarDate, sessions]);

  const navigateMonth = (direction: 'prev' | 'next'): void => {
    setCalendarDate((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = (): void => {
    setCalendarDate(new Date());
  };

  const handleCalendarSessionClick = (session: Session): void => {
    // Switch to list view and scroll to the session
    setViewMode('list');
    // Use setTimeout to allow the view to switch before scrolling
    setTimeout(() => {
      const element = sessionRefs.current[session.id];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a brief highlight effect
        element.style.boxShadow = '0 0 0 3px var(--mantine-color-blue-5)';
        setTimeout(() => {
          element.style.boxShadow = '';
        }, 2000);
      }
    }, 100);
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const resetSessionForm = (): void => {
    setSessionForm({
      name: '',
      date: new Date(),
      locationId: '',
      notes: '',
    });
  };

  const handleCreateSession = (): void => {
    const selectedLocation = locations?.find((l) => l.id === sessionForm.locationId);
    if (!selectedLocation) return;

    createMutation.mutate({
      name: sessionForm.name,
      date: sessionForm.date.toISOString(),
      locationName: selectedLocation.name,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      notes: sessionForm.notes || undefined,
    });
  };

  const handleUpdateSession = (): void => {
    if (editingSession) {
      const selectedLocation = locations?.find((l) => l.id === sessionForm.locationId);
      if (!selectedLocation) return;

      updateMutation.mutate({
        id: editingSession.id,
        data: {
          name: sessionForm.name,
          date: sessionForm.date.toISOString(),
          locationName: selectedLocation.name,
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          notes: sessionForm.notes || undefined,
        },
      });
    }
  };

  const handleEditSession = (session: Session): void => {
    setEditingSession(session);
    // Find matching location by coordinates
    const matchingLocation = locations?.find(
      (l) => l.latitude === session.latitude && l.longitude === session.longitude
    );
    setSessionForm({
      name: session.name,
      date: new Date(session.date),
      locationId: matchingLocation?.id || '',
      notes: session.notes || '',
    });
    setSessionModalOpen(true);
  };

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={1}>Imaging Sessions</Title>
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
                  <Card
                    key={session.id}
                    shadow="sm"
                    padding="lg"
                    withBorder
                    ref={(el) => {
                      sessionRefs.current[session.id] = el;
                    }}
                    style={{ transition: 'box-shadow 0.3s ease' }}
                  >
                    <Stack gap="sm">
                      <Group justify="space-between">
                        <div>
                          <Text fw={600} size="lg">
                            {session.name}
                          </Text>
                          <Text size="sm" c="dimmed">
                            {new Date(session.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
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
                        {session.locationName && (
                          <Text size="sm">
                            <strong>Location:</strong> {session.locationName}
                          </Text>
                        )}
                      </Group>

                      {session.notes && (
                        <Text size="sm" c="dimmed">
                          {session.notes}
                        </Text>
                      )}

                      {session.sessionTargets.length > 0 && session.sessionTargets[0] && (
                        <Group gap="sm">
                          <Text size="sm" fw={500}>Target:</Text>
                          <Text size="sm">{session.sessionTargets[0].target.name}</Text>
                          {session.sessionTargets[0].target.catalogId && (
                            <Text size="sm" c="dimmed">
                              ({session.sessionTargets[0].target.catalogId})
                            </Text>
                          )}
                          <Badge size="sm" variant="light">
                            {session.sessionTargets[0].target.type}
                          </Badge>
                        </Group>
                      )}
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
            <Paper withBorder p="md">
              {/* Calendar Header */}
              <Group justify="space-between" mb="md">
                <Group gap="xs">
                  <ActionIcon variant="subtle" onClick={() => navigateMonth('prev')}>
                    <IconChevronLeft size={20} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" onClick={() => navigateMonth('next')}>
                    <IconChevronRight size={20} />
                  </ActionIcon>
                  <Title order={3} ml="sm">
                    {monthNames[calendarData.month]} {calendarData.year}
                  </Title>
                </Group>
                <Button variant="subtle" size="sm" onClick={goToToday}>
                  Today
                </Button>
              </Group>

              {/* Day Headers */}
              <SimpleGrid cols={7} spacing={0}>
                {dayNames.map((day) => (
                  <Box
                    key={day}
                    p="xs"
                    style={{
                      borderBottom: '1px solid var(--mantine-color-dark-4)',
                      textAlign: 'center',
                    }}
                  >
                    <Text size="sm" fw={600} c="dimmed">
                      {day}
                    </Text>
                  </Box>
                ))}
              </SimpleGrid>

              {/* Calendar Grid */}
              <SimpleGrid cols={7} spacing={0}>
                {calendarData.days.map((day, index) => (
                  <Box
                    key={index}
                    p="xs"
                    style={{
                      minHeight: 100,
                      borderBottom: '1px solid var(--mantine-color-dark-4)',
                      borderRight: (index + 1) % 7 !== 0 ? '1px solid var(--mantine-color-dark-4)' : undefined,
                      backgroundColor: isToday(day.date)
                        ? 'var(--mantine-color-blue-9)'
                        : day.isCurrentMonth
                          ? 'var(--mantine-color-dark-6)'
                          : 'var(--mantine-color-dark-8)',
                      opacity: day.isCurrentMonth ? 1 : 0.5,
                    }}
                  >
                    <Text
                      size="sm"
                      fw={isToday(day.date) ? 700 : 400}
                      c={day.isCurrentMonth ? (isToday(day.date) ? 'blue.3' : 'inherit') : 'dark.3'}
                      mb="xs"
                    >
                      {day.date.getDate()}
                    </Text>
                    <Stack gap={4}>
                      {day.sessions.map((session) => (
                        <Tooltip
                          key={session.id}
                          label={
                            <Stack gap={2}>
                              <Text size="xs" fw={500}>{session.name}</Text>
                              {session.locationName && (
                                <Text size="xs" c="dimmed">{session.locationName}</Text>
                              )}
                              {session.sessionTargets[0]?.target && (
                                <Text size="xs">Target: {session.sessionTargets[0].target.name}</Text>
                              )}
                            </Stack>
                          }
                          withArrow
                          multiline
                          w={200}
                        >
                          <Box
                            onClick={() => handleCalendarSessionClick(session)}
                            style={{
                              backgroundColor: 'var(--mantine-color-blue-6)',
                              color: 'white',
                              padding: '2px 6px',
                              borderRadius: 4,
                              cursor: 'pointer',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontSize: 11,
                            }}
                          >
                            {session.name}
                          </Box>
                        </Tooltip>
                      ))}
                    </Stack>
                  </Box>
                ))}
              </SimpleGrid>
            </Paper>
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
            <TextInput
              label="Session Name"
              placeholder="e.g., M31 Imaging Session"
              value={sessionForm.name}
              onChange={(e) =>
                setSessionForm({ ...sessionForm, name: e.target.value })
              }
              required
            />
            <DateTimePicker
              label="Date"
              value={sessionForm.date}
              onChange={(val) =>
                val && setSessionForm({ ...sessionForm, date: val })
              }
              required
            />
            <Select
              label="Location"
              placeholder="Select a location"
              data={
                locations?.map((l) => ({
                  value: l.id,
                  label: l.name,
                })) || []
              }
              value={sessionForm.locationId}
              onChange={(val) =>
                setSessionForm({ ...sessionForm, locationId: val || '' })
              }
              searchable
              required
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
                disabled={!sessionForm.name || !sessionForm.locationId}
              >
                {editingSession ? 'Save' : 'Create'}
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
