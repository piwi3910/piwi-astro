import { Container, Title, Text, Button, Stack, Group } from '@mantine/core';
import Link from 'next/link';

export default function HomePage(): JSX.Element {
  return (
    <Container size="lg" py="xl">
      <Stack gap="xl" align="center" style={{ minHeight: '80vh', justifyContent: 'center' }}>
        <Stack gap="md" align="center">
          <Title order={1} size="3.5rem">
            AstroPlanner
          </Title>
          <Text size="xl" c="dimmed" ta="center">
            Your complete astrophotography planning and portfolio platform
          </Text>
        </Stack>

        <Group>
          <Button
            component={Link}
            href="/dashboard"
            size="lg"
            variant="filled"
          >
            Go to Dashboard
          </Button>
          <Button
            component={Link}
            href="/gallery"
            size="lg"
            variant="outline"
          >
            Browse Gallery
          </Button>
        </Group>

        <Stack gap="xs" mt="xl">
          <Text size="sm" c="dimmed">
            🔭 Plan your imaging sessions
          </Text>
          <Text size="sm" c="dimmed">
            📸 Track your targets and progress
          </Text>
          <Text size="sm" c="dimmed">
            🌌 Share your astrophotography portfolio
          </Text>
          <Text size="sm" c="dimmed">
            🌟 Discover work from other astrophotographers
          </Text>
        </Stack>
      </Stack>
    </Container>
  );
}
