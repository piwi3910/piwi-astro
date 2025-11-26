'use client';

import { useState } from 'react';
import { Container, Title, Stack, Grid, Paper, Text, Group, ThemeIcon } from '@mantine/core';
import { IconUpload, IconList } from '@tabler/icons-react';
import { ImageDropzone } from '@/components/upload/ImageDropzone';
import { ProcessingQueue } from '@/components/upload/ProcessingQueue';

export default function UploadPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadComplete = () => {
    // Trigger a refresh of the processing queue
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1}>Upload Images</Title>
          <Text c="dimmed" mt="xs">
            Upload your FITS and XISF files for automatic processing
          </Text>
        </div>

        <Grid gutter="xl">
          {/* Upload Section */}
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Paper p="lg" withBorder h="100%">
              <Stack gap="md">
                <Group gap="sm">
                  <ThemeIcon size="lg" variant="light">
                    <IconUpload size={20} />
                  </ThemeIcon>
                  <div>
                    <Text fw={500}>Upload Files</Text>
                    <Text size="xs" c="dimmed">
                      Drag & drop or click to browse
                    </Text>
                  </div>
                </Group>

                <ImageDropzone onUploadComplete={handleUploadComplete} />

                <Text size="xs" c="dimmed">
                  Supported formats: FITS (.fits, .fit, .fts) and XISF (.xisf)
                </Text>
                <Text size="xs" c="dimmed">
                  Your images will be automatically processed to extract
                  metadata. If coordinates are missing, plate solving will be
                  attempted to identify the target.
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>

          {/* Processing Queue Section */}
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Paper p="lg" withBorder h="100%">
              <Stack gap="md">
                <Group gap="sm">
                  <ThemeIcon size="lg" variant="light" color="violet">
                    <IconList size={20} />
                  </ThemeIcon>
                  <div>
                    <Text fw={500}>Processing Queue</Text>
                    <Text size="xs" c="dimmed">
                      Track the status of your uploads
                    </Text>
                  </div>
                </Group>

                <ProcessingQueue refreshTrigger={refreshTrigger} />
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Help Section */}
        <Paper p="lg" withBorder>
          <Stack gap="md">
            <Text fw={500}>How it works</Text>
            <Grid gutter="md">
              <Grid.Col span={{ base: 12, sm: 4 }}>
                <Stack gap="xs">
                  <Text size="sm" fw={500} c="blue">
                    1. Upload
                  </Text>
                  <Text size="sm" c="dimmed">
                    Drop your FITS or XISF files. They'll be uploaded to secure
                    storage and queued for processing.
                  </Text>
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 4 }}>
                <Stack gap="xs">
                  <Text size="sm" fw={500} c="blue">
                    2. Extract Metadata
                  </Text>
                  <Text size="sm" c="dimmed">
                    The system extracts target name, coordinates, exposure
                    settings, and other metadata from the file headers.
                  </Text>
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 4 }}>
                <Stack gap="xs">
                  <Text size="sm" fw={500} c="blue">
                    3. Match Target
                  </Text>
                  <Text size="sm" c="dimmed">
                    The image is matched to a target in the catalog. If
                    coordinates are missing, plate solving identifies the
                    field.
                  </Text>
                </Stack>
              </Grid.Col>
            </Grid>

            <Text size="xs" c="dimmed" mt="md">
              Note: If automatic matching fails, you can manually assign a
              target to your image using the "Assign Target" button on failed
              jobs.
            </Text>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
