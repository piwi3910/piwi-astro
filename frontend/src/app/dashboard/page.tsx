import { Container, Title, Text } from '@mantine/core';

export default function DashboardPage(): JSX.Element {
  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="md">
        Dashboard
      </Title>
      <Text c="dimmed">
        Welcome to your personal astrophotography workspace
      </Text>
    </Container>
  );
}
