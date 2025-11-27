'use client';

import { useState } from 'react';
import {
  Container,
  Title,
  Stack,
  Grid,
  GridCol,
  Card,
  Text,
  Group,
  ThemeIcon,
} from '@/components/ui';
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
    <Container size="xl" className="py-8">
      <Stack gap="xl">
        <div>
          <Title order={1}>Upload Images</Title>
          <Text c="dimmed" className="mt-2">
            Upload your astrophotography images for automatic target matching
          </Text>
        </div>

        <Grid gutter="xl">
          {/* Upload Section */}
          <GridCol span={{ base: 12, md: 6 }}>
            <Card className="p-6 h-full">
              <Stack gap="md">
                <Group gap="sm">
                  <ThemeIcon size="lg" variant="light">
                    <IconUpload size={20} />
                  </ThemeIcon>
                  <div>
                    <Text fw="medium">Upload Files</Text>
                    <Text size="xs" c="dimmed">
                      Drag & drop or click to browse
                    </Text>
                  </div>
                </Group>

                <ImageDropzone onUploadComplete={handleUploadComplete} />

                <Text size="xs" c="dimmed">
                  Supported formats: PNG and JPEG (.png, .jpg, .jpeg)
                </Text>
                <Text size="xs" c="dimmed">
                  Your images will be plate-solved to identify the target
                  based on star positions.
                </Text>
              </Stack>
            </Card>
          </GridCol>

          {/* Processing Queue Section */}
          <GridCol span={{ base: 12, md: 6 }}>
            <Card className="p-6 h-full">
              <Stack gap="md">
                <Group gap="sm">
                  <ThemeIcon size="lg" variant="light" color="secondary">
                    <IconList size={20} />
                  </ThemeIcon>
                  <div>
                    <Text fw="medium">Processing Queue</Text>
                    <Text size="xs" c="dimmed">
                      Track the status of your uploads
                    </Text>
                  </div>
                </Group>

                <ProcessingQueue refreshTrigger={refreshTrigger} />
              </Stack>
            </Card>
          </GridCol>
        </Grid>

        {/* Help Section */}
        <Card className="p-6">
          <Stack gap="md">
            <Text fw="medium">How it works</Text>
            <Grid gutter="md">
              <GridCol span={{ base: 12, sm: 4 }}>
                <Stack gap="xs">
                  <Text size="sm" fw="medium" className="text-blue-500">
                    1. Upload
                  </Text>
                  <Text size="sm" c="dimmed">
                    Drop your PNG or JPEG images. They&apos;ll be uploaded to secure
                    storage and queued for processing.
                  </Text>
                </Stack>
              </GridCol>
              <GridCol span={{ base: 12, sm: 4 }}>
                <Stack gap="xs">
                  <Text size="sm" fw="medium" className="text-blue-500">
                    2. Plate Solve
                  </Text>
                  <Text size="sm" c="dimmed">
                    The system analyzes star positions in your image to
                    determine the exact sky coordinates.
                  </Text>
                </Stack>
              </GridCol>
              <GridCol span={{ base: 12, sm: 4 }}>
                <Stack gap="xs">
                  <Text size="sm" fw="medium" className="text-blue-500">
                    3. Match Target
                  </Text>
                  <Text size="sm" c="dimmed">
                    Using the coordinates from plate solving, the image is
                    automatically matched to a target in the catalog.
                  </Text>
                </Stack>
              </GridCol>
            </Grid>

            <Text size="xs" c="dimmed" className="mt-4">
              Note: If automatic matching fails, you can manually assign a
              target to your image using the &quot;Assign Target&quot; button on failed
              jobs.
            </Text>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
