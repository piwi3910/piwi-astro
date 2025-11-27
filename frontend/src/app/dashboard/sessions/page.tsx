'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Grid, GridCol } from '@/components/ui/grid';
import { Box } from '@/components/ui/box';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DateTimePicker } from '@/components/ui/date-time-picker';
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

export default function SessionsPage() {
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
        element.style.boxShadow = '0 0 0 3px #228be6';
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
    <Container size="xl" className="py-8">
      <Stack gap="lg">
        <Group justify="between">
          <Title order={1}>Imaging Sessions</Title>
        </Group>

        <Tabs value={viewMode} onValueChange={(val) => setViewMode(val as 'list' | 'calendar')}>
          <TabsList>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <IconList size={16} />
              List View
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <IconCalendar size={16} />
              Calendar View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            {sessions && sessions.length > 0 ? (
              <Stack gap="md">
                {sessions.map((session) => (
                  <Card
                    key={session.id}
                    className="shadow-sm border transition-shadow duration-300"
                    style={{ backgroundColor: '#1a1b1e' }}
                    ref={(el) => {
                      sessionRefs.current[session.id] = el;
                    }}
                  >
                    <CardContent className="p-6">
                      <Stack gap="sm">
                        <Group justify="between">
                          <div>
                            <Text className="font-semibold text-lg">
                              {session.name}
                            </Text>
                            <Text className="text-sm text-muted-foreground">
                              {new Date(session.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </Text>
                          </div>
                          <Group gap="xs">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditSession(session)}
                            >
                              <IconEdit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(session.id)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            >
                              <IconTrash size={16} />
                            </Button>
                          </Group>
                        </Group>

                        <Group gap="lg">
                          {session.locationName && (
                            <Text className="text-sm">
                              <strong>Location:</strong> {session.locationName}
                            </Text>
                          )}
                        </Group>

                        {session.notes && (
                          <Text className="text-sm text-muted-foreground">
                            {session.notes}
                          </Text>
                        )}

                        {session.sessionTargets.length > 0 && session.sessionTargets[0] && (
                          <Group gap="sm">
                            <Text className="text-sm font-medium">Target:</Text>
                            <Text className="text-sm">{session.sessionTargets[0].target.name}</Text>
                            {session.sessionTargets[0].target.catalogId && (
                              <Text className="text-sm text-muted-foreground">
                                ({session.sessionTargets[0].target.catalogId})
                              </Text>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {session.sessionTargets[0].target.type}
                            </Badge>
                          </Group>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Text className="text-muted-foreground text-center py-12">
                No sessions planned yet. Create your first imaging session!
              </Text>
            )}
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            <Card withBorder className="p-4" style={{ backgroundColor: '#1a1b1e' }}>
              {/* Calendar Header */}
              <Group justify="between" className="mb-4">
                <Group gap="xs">
                  <Button variant="ghost" size="icon" onClick={() => navigateMonth('prev')}>
                    <IconChevronLeft size={20} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => navigateMonth('next')}>
                    <IconChevronRight size={20} />
                  </Button>
                  <Title order={3} className="ml-2">
                    {monthNames[calendarData.month]} {calendarData.year}
                  </Title>
                </Group>
                <Button variant="ghost" size="sm" onClick={goToToday}>
                  Today
                </Button>
              </Group>

              {/* Day Headers */}
              <Grid cols={7} gap="none">
                {dayNames.map((day) => (
                  <GridCol
                    key={day}
                    span={1}
                    className="p-2 text-center border-b"
                    style={{
                      borderColor: '#373a40',
                      backgroundColor: '#1a1b1e',
                    }}
                  >
                    <Text className="text-sm font-semibold text-muted-foreground">
                      {day}
                    </Text>
                  </GridCol>
                ))}
              </Grid>

              {/* Calendar Grid */}
              <Grid cols={7} gap="none">
                {calendarData.days.map((day, index) => (
                  <GridCol
                    key={index}
                    span={1}
                    className="p-2"
                    style={{
                      minHeight: 100,
                      borderBottom: '1px solid #373a40',
                      borderRight: (index + 1) % 7 !== 0 ? '1px solid #373a40' : undefined,
                      backgroundColor: isToday(day.date)
                        ? '#1971c2'
                        : day.isCurrentMonth
                          ? '#25262b'
                          : '#1a1b1e',
                    }}
                  >
                    <Text
                      className={`text-sm mb-2 ${isToday(day.date) ? 'font-bold' : ''}`}
                      style={{
                        color: day.isCurrentMonth ? (isToday(day.date) ? '#74c0fc' : 'inherit') : '#5c5f66',
                      }}
                    >
                      {day.date.getDate()}
                    </Text>
                    <Stack gap="xs">
                      {day.sessions.map((session) => (
                        <TooltipProvider key={session.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Box
                                onClick={() => handleCalendarSessionClick(session)}
                                style={{
                                  backgroundColor: '#228be6',
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
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[200px]">
                              <Stack gap="none">
                                <Text className="text-xs font-medium">{session.name}</Text>
                                {session.locationName && (
                                  <Text className="text-xs text-muted-foreground">{session.locationName}</Text>
                                )}
                                {session.sessionTargets[0]?.target && (
                                  <Text className="text-xs">Target: {session.sessionTargets[0].target.name}</Text>
                                )}
                              </Stack>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </Stack>
                  </GridCol>
                ))}
              </Grid>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Session Modal */}
        <Dialog
          open={sessionModalOpen}
          onOpenChange={(open) => {
            setSessionModalOpen(open);
            if (!open) {
              setEditingSession(null);
              resetSessionForm();
            }
          }}
        >
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingSession ? 'Edit Session' : 'New Session'}</DialogTitle>
            </DialogHeader>
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
              />
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <Select
                  value={sessionForm.locationId}
                  onValueChange={(val) =>
                    setSessionForm({ ...sessionForm, locationId: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  placeholder="Session notes..."
                  value={sessionForm.notes}
                  onChange={(e) =>
                    setSessionForm({ ...sessionForm, notes: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </Stack>
            <DialogFooter>
              <Button
                variant="ghost"
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
                disabled={createMutation.isPending || updateMutation.isPending || !sessionForm.name || !sessionForm.locationId}
              >
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingSession ? 'Save' : 'Create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Scroll to top button */}
        <Button
          variant="default"
          size="icon"
          className="rounded-full fixed bottom-6 right-6 z-1000 shadow-lg transition-opacity"
          onClick={scrollToTop}
          style={{
            opacity: showScrollTop ? 1 : 0,
            visibility: showScrollTop ? 'visible' : 'hidden',
            transition: 'opacity 0.3s, visibility 0.3s',
            width: '48px',
            height: '48px',
          }}
          aria-label="Scroll to top"
        >
          <IconArrowUp size={24} />
        </Button>
      </Stack>
    </Container>
  );
}
