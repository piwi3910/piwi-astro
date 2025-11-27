'use client';

import { useState } from 'react';
import {
  Stack,
  Group,
  Text,
  Card,
  Badge,
  Button,
  Loader,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Box,
} from '@/components/ui';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Autocomplete } from '@/components/ui/autocomplete';
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
} from '@tabler/icons-react';
import { notifications } from '@/components/ui/notifications';

interface ProcessingJob {
  id: string;
  originalName: string;
  fileSize: number;
  status: string;
  errorMessage: string | null;
  targetId: string | null;
  targetMatch: string | null;
  targetName: string | null;
  ra: number | null;
  dec: number | null;
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
    processing: number;
    completed: number;
    failed: number;
    needsTarget: number;
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
    case 'PROCESSING':
    case 'EXTRACTING':
    case 'PLATE_SOLVING':
      return 'blue';
    case 'COMPLETED':
      return 'green';
    case 'FAILED':
    case 'NEEDS_TARGET':
      return 'red';
    default:
      return 'gray';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'PENDING':
      return <IconClock size={14} />;
    case 'PROCESSING':
    case 'EXTRACTING':
    case 'PLATE_SOLVING':
      return <IconLoader size={14} className="rotating" />;
    case 'COMPLETED':
      return <IconCheck size={14} />;
    case 'FAILED':
    case 'NEEDS_TARGET':
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
    <Card p="xs" withBorder>
      <Group justify="between" wrap="nowrap" gap="xs">
        <Group gap="xs" wrap="nowrap" className="flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(!expanded)}
            className="h-6 w-6"
          >
            {expanded ? (
              <IconChevronDown size={12} />
            ) : (
              <IconChevronRight size={12} />
            )}
          </Button>
          <Text size="xs" truncate className="flex-1 min-w-0">
            {job.originalName}
          </Text>
          <Text size="xs" c="dimmed" className="shrink-0">
            {formatFileSize(job.fileSize)}
          </Text>
          <Badge
            size="xs"
            className="gap-1 shrink-0"
            variant={getStatusColor(job.status) === 'gray' ? 'outline' : 'default'}
          >
            {getStatusIcon(job.status)}
            {job.status}
          </Badge>
          {job.targetName && (
            <Badge size="xs" variant="outline" className="shrink-0">
              {job.targetName}
            </Badge>
          )}
        </Group>

        <Group gap="xs" className="shrink-0">
          {(job.status === 'FAILED' || job.status === 'NEEDS_TARGET') && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRetry(job.id)}
                    className="h-6 w-6 text-blue-500"
                  >
                    <IconRefresh size={12} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Retry plate solving</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onComplete(job.id)}
                    className="h-6 w-6 text-green-500"
                  >
                    <IconTarget size={12} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Manually assign target</TooltipContent>
              </Tooltip>
            </>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(job.id)}
                className="h-6 w-6 text-red-500"
              >
                <IconTrash size={12} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </Group>
      </Group>

      <div
        className={`overflow-hidden transition-all duration-200 ${expanded ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}
      >
        <Box className="p-2 bg-card/50 rounded-sm">
          <Stack gap="xs">
            <Group gap="xl">
              <Stack gap="sm">
                <Text size="xs" c="dimmed">
                  Created
                </Text>
                <Text size="xs">{formatDate(job.createdAt)}</Text>
              </Stack>
              {job.completedAt && (
                <Stack gap="sm">
                  <Text size="xs" c="dimmed">
                    Completed
                  </Text>
                  <Text size="xs">{formatDate(job.completedAt)}</Text>
                </Stack>
              )}
            </Group>

            {/* Plate solve coordinates */}
            {job.ra !== null && job.dec !== null && (
              <Stack gap="sm">
                <Text size="xs" c="dimmed" fw="medium">
                  Plate Solve Result
                </Text>
                <Text size="xs">
                  RA: {job.ra.toFixed(4)}°, Dec: {job.dec.toFixed(4)}°
                </Text>
              </Stack>
            )}

            {/* Target match */}
            {job.target && (
              <Stack gap="sm">
                <Text size="xs" c="dimmed" fw="medium">
                  Matched Target ({job.targetMatch})
                </Text>
                <Text size="xs">
                  {job.target.catalogId || job.target.name} - {job.target.type}
                </Text>
              </Stack>
            )}
          </Stack>
        </Box>
      </div>
    </Card>
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
    processing: 0,
    completed: 0,
    failed: 0,
    needsTarget: 0,
  };

  const processingCount = counts.pending + counts.processing;

  return (
    <>
      <Stack gap="md">
        <Group justify="between">
          <Text size="lg" fw="medium">
            Processing Queue
          </Text>
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <IconRefresh size={18} />
          </Button>
        </Group>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v || 'all')}>
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              All
              {data?.pagination.total ? (
                <Badge size="xs" variant="secondary">
                  {data.pagination.total}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="processing" className="gap-2">
              Processing
              {processingCount > 0 ? (
                <Badge size="xs" variant="secondary">
                  {processingCount}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              Completed
              {counts.completed > 0 ? (
                <Badge size="xs" variant="secondary">
                  {counts.completed}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="failed" className="gap-2">
              Failed
              {counts.failed > 0 ? (
                <Badge size="xs" variant="secondary">
                  {counts.failed}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {isLoading ? (
              <Group justify="center" className="p-8">
                <Loader size="sm" />
                <Text size="sm" c="dimmed">
                  Loading...
                </Text>
              </Group>
            ) : data?.jobs.length === 0 ? (
              <Text c="dimmed" className="text-center py-8">
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
          </TabsContent>
        </Tabs>
      </Stack>

      {/* Manual complete modal */}
      <Dialog open={completeModalOpen} onOpenChange={setCompleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Target</DialogTitle>
          </DialogHeader>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Select a target to associate with this image:
            </Text>

            <Autocomplete
              label="Search Target"
              placeholder="Type to search..."
              data={
                searchedTargets?.map((t) => ({
                  value: t.id,
                  label: `${t.catalogId || t.name} - ${t.type}`,
                })) || []
              }
              value={targetSearch}
              onChange={setTargetSearch}
              onOptionSubmit={(value) => {
                setSelectedTargetId(value);
              }}
            />

            <div className="space-y-1.5">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                placeholder="Image title"
                value={targetTitle}
                onChange={(e) => setTargetTitle(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setCompleteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCompleteSubmit}
                disabled={!selectedTargetId || completeMutation.isPending}
              >
                {completeMutation.isPending ? 'Completing...' : 'Complete'}
              </Button>
            </DialogFooter>
          </Stack>
        </DialogContent>
      </Dialog>

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
