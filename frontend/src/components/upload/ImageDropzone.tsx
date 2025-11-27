'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Text,
  Group,
  Stack,
  Progress,
  Card,
  ThemeIcon,
  Badge,
  Button,
} from '@/components/ui';
import {
  IconUpload,
  IconPhoto,
  IconX,
  IconCheck,
  IconAlertCircle,
} from '@tabler/icons-react';

interface UploadingFile {
  file: File;
  id: string;
  progress: number;
  status: 'uploading' | 'queued' | 'error';
  jobId?: string;
  error?: string;
}

interface ImageDropzoneProps {
  onUploadComplete?: () => void;
}

export function ImageDropzone({ onUploadComplete }: ImageDropzoneProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      // Create tracking entries for each file
      const newFiles: UploadingFile[] = files.map((file) => ({
        file,
        id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
        progress: 0,
        status: 'uploading' as const,
      }));

      setUploadingFiles((prev) => [...prev, ...newFiles]);

      // Upload files
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      try {
        // Update progress to show upload started
        setUploadingFiles((prev) =>
          prev.map((f) =>
            newFiles.some((nf) => nf.id === f.id)
              ? { ...f, progress: 30 }
              : f
          )
        );

        const response = await fetch('/api/images/upload-raw', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          // Mark all as error
          setUploadingFiles((prev) =>
            prev.map((f) =>
              newFiles.some((nf) => nf.id === f.id)
                ? { ...f, status: 'error', error: data.error || 'Upload failed' }
                : f
            )
          );
          return;
        }

        // Update each file with its result
        setUploadingFiles((prev) =>
          prev.map((f) => {
            if (!newFiles.some((nf) => nf.id === f.id)) return f;

            const result = data.results?.find(
              (r: { fileName: string }) => r.fileName === f.file.name
            );

            if (result?.status === 'queued') {
              return {
                ...f,
                progress: 100,
                status: 'queued',
                jobId: result.jobId,
              };
            } else {
              return {
                ...f,
                status: 'error',
                error: result?.error || 'Unknown error',
              };
            }
          })
        );

        // Notify parent that upload is complete
        onUploadComplete?.();
      } catch (error) {
        // Mark all as error
        setUploadingFiles((prev) =>
          prev.map((f) =>
            newFiles.some((nf) => nf.id === f.id)
              ? {
                  ...f,
                  status: 'error',
                  error:
                    error instanceof Error ? error.message : 'Upload failed',
                }
              : f
          )
        );
      }
    },
    [onUploadComplete]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        uploadFiles(acceptedFiles);
      }
    },
    [uploadFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const removeFile = (id: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearCompleted = () => {
    setUploadingFiles((prev) => prev.filter((f) => f.status !== 'queued'));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <Stack gap="md">
      <Box
        {...getRootProps()}
        className="border-2 border-dashed rounded-md p-8 cursor-pointer transition-all duration-200 ease-in-out"
        style={{
          borderColor: isDragActive ? 'hsl(var(--primary))' : 'hsl(var(--border))',
          backgroundColor: isDragActive ? 'hsl(var(--accent))' : 'transparent',
        }}
      >
        <input {...getInputProps()} />
        <Stack align="center" gap="xs">
          <ThemeIcon
            size={60}
            radius="xl"
            variant="light"
            color={isDragActive ? 'blue' : 'gray'}
          >
            <IconUpload size={30} />
          </ThemeIcon>
          <Text size="lg" fw="medium">
            {isDragActive
              ? 'Drop your files here'
              : 'Drag & drop your astrophotography images'}
          </Text>
          <Text size="sm" c="dimmed">
            or click to browse (max 50MB per file)
          </Text>
          <Group gap="xs" className="mt-1">
            <Badge variant="outline" size="sm">
              .png
            </Badge>
            <Badge variant="outline" size="sm">
              .jpg
            </Badge>
            <Badge variant="outline" size="sm">
              .jpeg
            </Badge>
          </Group>
        </Stack>
      </Box>

      {/* Upload progress */}
      {uploadingFiles.length > 0 && (
        <Stack gap="xs">
          <Group justify="between">
            <Text size="sm" fw="medium">
              Uploads
            </Text>
            {uploadingFiles.some((f) => f.status === 'queued') && (
              <Text
                size="xs"
                c="dimmed"
                className="cursor-pointer"
                onClick={clearCompleted}
              >
                Clear completed
              </Text>
            )}
          </Group>

          {uploadingFiles.map((file) => (
            <Card key={file.id} p="sm" withBorder>
              <Group justify="between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap" className="flex-1 min-w-0">
                  <ThemeIcon
                    size="sm"
                    variant="light"
                    color={
                      file.status === 'error'
                        ? 'destructive'
                        : file.status === 'queued'
                          ? 'green'
                          : 'blue'
                    }
                  >
                    {file.status === 'error' ? (
                      <IconAlertCircle size={14} />
                    ) : file.status === 'queued' ? (
                      <IconCheck size={14} />
                    ) : (
                      <IconPhoto size={14} />
                    )}
                  </ThemeIcon>
                  <Stack gap="sm" className="flex-1 min-w-0">
                    <Text size="sm" truncate>
                      {file.file.name}
                    </Text>
                    <Group gap="xs">
                      <Text size="xs" c="dimmed">
                        {formatFileSize(file.file.size)}
                      </Text>
                      {file.status === 'queued' && (
                        <Badge size="xs" variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
                          Queued for processing
                        </Badge>
                      )}
                      {file.status === 'error' && (
                        <Text size="xs" c="destructive">
                          {file.error}
                        </Text>
                      )}
                    </Group>
                    {file.status === 'uploading' && (
                      <Progress
                        value={file.progress}
                        className="mt-1 h-1"
                      />
                    )}
                  </Stack>
                </Group>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(file.id)}
                  className="h-8 w-8"
                >
                  <IconX size={14} />
                </Button>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
