'use client';

import { useState } from 'react';
import {
  Stack,
  Group,
  Text,
  Paper,
  Badge,
  ActionIcon,
  Tabs,
  Loader,
  Modal,
  Button,
  Select,
  TextInput,
  Tooltip,
  Box,
  Collapse,
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IconRefresh,
  IconTrash,
  IconCheck,
  IconAlertCircle,
  IconClock,
  IconLoader,
  IconChevronDown,
  IconChevronRight,
  IconTarget,
  IconCalendar,
  IconFilter,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface ProcessingJob {
  id: string;
  originalName: string;
  fileSize: number;
  status: string;
  errorMessage: string | null;
  errorDetails: string | null;
  extractedMetadata: Record<string, unknown> | null;
  targetId: string | null;
  targetMatch: string | null;
  targetName: string | null;
  ra: number | null;
  dec: number | null;
  exposureTime: number | null;
  totalIntegration: number | null;
  filter: string | null;
  captureDate: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  target: {
    id: string;
    catalogId: string | null;
    name: string;
    type: string;
  } | null;
  imageUpload: {
    id: string;
    url: string;
    thumbnailUrl: string | null;
  } | null;
}

interface ProcessingQueueResponse {
  jobs: ProcessingJob[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  counts: {
    pending: number;
    extracting: number;
    plateSolving: number;
    matching: number;
    completed: number;
    failed: number;
  };
}

interface Target {
  id: string;
  catalogId: string | null;
  name: string;
  type: string;
}

async function fetchProcessingJobs(
  status?: string
): Promise<ProcessingQueueResponse> {
  const params = new URLSearchParams();
  if (status && status !== 'all') {
    params.set('status', status);
  }
  const response = await fetch(`/api/images/processing?${params}`);
  if (!response.ok) throw new Error('Failed to fetch processing jobs');
  return response.json();
}

async function fetchTargets(search: string): Promise<Target[]> {
  if (!search || search.length < 2) return [];
  const response = await fetch(`/api/targets?search=${encodeURIComponent(search)}&limit=20`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.targets || data;
}

async function deleteJob(id: string): Promise<void> {
  const response = await fetch(`/api/images/processing/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete job');
}

async function retryJob(id: string): Promise<void> {
  const response = await fetch(`/api/images/processing/${id}/retry`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to retry job');
}

async function completeJob(
  id: string,
  data: { targetId: string; title?: string }
): Promise<void> {
  const response = await fetch(`/api/images/processing/${id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to complete job');
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'gray';
    case 'EXTRACTING':
    case 'PLATE_SOLVING':
    case 'MATCHING':
      return 'blue';
    case 'COMPLETED':
      return 'green';
    case 'FAILED':
      return 'red';
    default:
      return 'gray';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'PENDING':
      return <IconClock size={14} />;
    case 'EXTRACTING':
    case 'PLATE_SOLVING':
    case 'MATCHING':
      return <IconLoader size={14} className="rotating" />;
    case 'COMPLETED':
      return <IconCheck size={14} />;
    case 'FAILED':
      return <IconAlertCircle size={14} />;
    default:
      return <IconClock size={14} />;
  }
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString();
}

interface ProcessingJobCardProps {
  job: ProcessingJob;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
  onComplete: (id: string) => void;
}

function ProcessingJobCard({
  job,
  onDelete,
  onRetry,
  onComplete,
}: ProcessingJobCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Paper p="sm" withBorder>
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <IconChevronDown size={14} />
              ) : (
                <IconChevronRight size={14} />
              )}
            </ActionIcon>
            <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" fw={500} truncate>
                {job.originalName}
              </Text>
              <Group gap="xs">
                <Text size="xs" c="dimmed">
                  {formatFileSize(job.fileSize)}
                </Text>
                <Badge
                  size="xs"
                  color={getStatusColor(job.status)}
                  leftSection={getStatusIcon(job.status)}
                >
                  {job.status}
                </Badge>
                {job.targetName && (
                  <Badge size="xs" variant="outline" color="violet">
                    {job.targetName}
                  </Badge>
                )}
              </Group>
            </Stack>
          </Group>

          <Group gap="xs">
            {job.status === 'FAILED' && (
              <>
                <Tooltip label="Retry processing">
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    size="sm"
                    onClick={() => onRetry(job.id)}
                  >
                    <IconRefresh size={14} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Manually assign target">
                  <ActionIcon
                    variant="subtle"
                    color="green"
                    size="sm"
                    onClick={() => onComplete(job.id)}
                  >
                    <IconTarget size={14} />
                  </ActionIcon>
                </Tooltip>
              </>
            )}
            <Tooltip label="Delete">
              <ActionIcon
                variant="subtle"
                color="red"
                size="sm"
                onClick={() => onDelete(job.id)}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        <Collapse in={expanded}>
          <Box
            p="sm"
            style={{
              backgroundColor: 'var(--mantine-color-dark-7)',
              borderRadius: 'var(--mantine-radius-sm)',
            }}
          >
            <Stack gap="xs">
              <Group gap="xl">
                <Stack gap={2}>
                  <Text size="xs" c="dimmed">
                    Created
                  </Text>
                  <Text size="sm">{formatDate(job.createdAt)}</Text>
                </Stack>
                {job.completedAt && (
                  <Stack gap={2}>
                    <Text size="xs" c="dimmed">
                      Completed
                    </Text>
                    <Text size="sm">{formatDate(job.completedAt)}</Text>
                  </Stack>
                )}
              </Group>

              {/* Extracted metadata */}
              {(job.ra !== null ||
                job.dec !== null ||
                job.exposureTime ||
                job.filter ||
                job.captureDate) && (
                <Stack gap={2}>
                  <Text size="xs" c="dimmed" fw={500}>
                    Extracted Metadata
                  </Text>
                  <Group gap="md">
                    {job.ra !== null && job.dec !== null && (
                      <Text size="sm">
                        RA: {job.ra.toFixed(4)}°, Dec: {job.dec.toFixed(4)}°
                      </Text>
                    )}
                    {job.exposureTime && (
                      <Group gap={4}>
                        <IconClock size={12} />
                        <Text size="sm">{job.exposureTime}s</Text>
                      </Group>
                    )}
                    {job.filter && (
                      <Group gap={4}>
                        <IconFilter size={12} />
                        <Text size="sm">{job.filter}</Text>
                      </Group>
                    )}
                    {job.captureDate && (
                      <Group gap={4}>
                        <IconCalendar size={12} />
                        <Text size="sm">
                          {new Date(job.captureDate).toLocaleDateString()}
                        </Text>
                      </Group>
                    )}
                  </Group>
                </Stack>
              )}

              {/* Target match */}
              {job.target && (
                <Stack gap={2}>
                  <Text size="xs" c="dimmed" fw={500}>
                    Matched Target ({job.targetMatch})
                  </Text>
                  <Text size="sm">
                    {job.target.catalogId || job.target.name} - {job.target.type}
                  </Text>
                </Stack>
              )}

              {/* Error message */}
              {job.errorMessage && (
                <Stack gap={2}>
                  <Text size="xs" c="red" fw={500}>
                    Error
                  </Text>
                  <Text size="sm" c="red">
                    {job.errorMessage}
                  </Text>
                </Stack>
              )}
            </Stack>
          </Box>
        </Collapse>
      </Stack>
    </Paper>
  );
}

interface ProcessingQueueProps {
  refreshTrigger?: number;
}

export function ProcessingQueue({ refreshTrigger }: ProcessingQueueProps) {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [targetSearch, setTargetSearch] = useState('');
  const [targetTitle, setTargetTitle] = useState('');

  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['processing-jobs', activeTab, refreshTrigger],
    queryFn: () => fetchProcessingJobs(activeTab),
    refetchInterval: 5000, // Poll every 5 seconds for updates
  });

  const { data: searchedTargets } = useQuery({
    queryKey: ['targets-search', targetSearch],
    queryFn: () => fetchTargets(targetSearch),
    enabled: targetSearch.length >= 2,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processing-jobs'] });
      notifications.show({
        title: 'Deleted',
        message: 'Processing job deleted',
        color: 'green',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to delete',
        color: 'red',
      });
    },
  });

  const retryMutation = useMutation({
    mutationFn: retryJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processing-jobs'] });
      notifications.show({
        title: 'Retrying',
        message: 'Job has been re-queued',
        color: 'blue',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to retry',
        color: 'red',
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({
      id,
      targetId,
      title,
    }: {
      id: string;
      targetId: string;
      title?: string;
    }) => completeJob(id, { targetId, title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processing-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['images'] });
      setCompleteModalOpen(false);
      setSelectedJobId(null);
      setSelectedTargetId(null);
      setTargetSearch('');
      setTargetTitle('');
      notifications.show({
        title: 'Completed',
        message: 'Image has been added to your gallery',
        color: 'green',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to complete',
        color: 'red',
      });
    },
  });

  const handleComplete = (id: string) => {
    setSelectedJobId(id);
    const job = data?.jobs.find((j) => j.id === id);
    if (job?.targetName) {
      setTargetSearch(job.targetName);
      setTargetTitle(job.targetName);
    }
    setCompleteModalOpen(true);
  };

  const handleCompleteSubmit = () => {
    if (selectedJobId && selectedTargetId) {
      completeMutation.mutate({
        id: selectedJobId,
        targetId: selectedTargetId,
        title: targetTitle || undefined,
      });
    }
  };

  const counts = data?.counts || {
    pending: 0,
    extracting: 0,
    plateSolving: 0,
    matching: 0,
    completed: 0,
    failed: 0,
  };

  const processingCount =
    counts.pending + counts.extracting + counts.plateSolving + counts.matching;

  return (
    <>
      <Stack gap="md">
        <Group justify="space-between">
          <Text size="lg" fw={500}>
            Processing Queue
          </Text>
          <ActionIcon variant="subtle" onClick={() => refetch()}>
            <IconRefresh size={18} />
          </ActionIcon>
        </Group>

        <Tabs value={activeTab} onChange={(v) => setActiveTab(v || 'all')}>
          <Tabs.List>
            <Tabs.Tab
              value="all"
              rightSection={
                data?.pagination.total ? (
                  <Badge size="xs" variant="filled" color="gray">
                    {data.pagination.total}
                  </Badge>
                ) : null
              }
            >
              All
            </Tabs.Tab>
            <Tabs.Tab
              value="processing"
              rightSection={
                processingCount > 0 ? (
                  <Badge size="xs" variant="filled" color="blue">
                    {processingCount}
                  </Badge>
                ) : null
              }
            >
              Processing
            </Tabs.Tab>
            <Tabs.Tab
              value="completed"
              rightSection={
                counts.completed > 0 ? (
                  <Badge size="xs" variant="filled" color="green">
                    {counts.completed}
                  </Badge>
                ) : null
              }
            >
              Completed
            </Tabs.Tab>
            <Tabs.Tab
              value="failed"
              rightSection={
                counts.failed > 0 ? (
                  <Badge size="xs" variant="filled" color="red">
                    {counts.failed}
                  </Badge>
                ) : null
              }
            >
              Failed
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>

        {isLoading ? (
          <Group justify="center" p="xl">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              Loading...
            </Text>
          </Group>
        ) : data?.jobs.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            No processing jobs found
          </Text>
        ) : (
          <Stack gap="xs">
            {data?.jobs.map((job) => (
              <ProcessingJobCard
                key={job.id}
                job={job}
                onDelete={(id) => deleteMutation.mutate(id)}
                onRetry={(id) => retryMutation.mutate(id)}
                onComplete={handleComplete}
              />
            ))}
          </Stack>
        )}
      </Stack>

      {/* Manual complete modal */}
      <Modal
        opened={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        title="Assign Target"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Select a target to associate with this image:
          </Text>

          <Select
            label="Search Target"
            placeholder="Type to search..."
            searchable
            data={
              searchedTargets?.map((t) => ({
                value: t.id,
                label: `${t.catalogId || t.name} - ${t.type}`,
              })) || []
            }
            value={selectedTargetId}
            onChange={setSelectedTargetId}
            onSearchChange={setTargetSearch}
            searchValue={targetSearch}
            nothingFoundMessage={
              targetSearch.length < 2
                ? 'Type at least 2 characters'
                : 'No targets found'
            }
          />

          <TextInput
            label="Title (optional)"
            placeholder="Image title"
            value={targetTitle}
            onChange={(e) => setTargetTitle(e.target.value)}
          />

          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setCompleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCompleteSubmit}
              loading={completeMutation.isPending}
              disabled={!selectedTargetId}
            >
              Complete
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* CSS for rotating animation */}
      <style jsx global>{`
        .rotating {
          animation: rotate 1s linear infinite;
        }
        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}
