import { Container, Title, Text } from '@mantine/core';

export default function GalleryPage(): JSX.Element {
  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="md">
        Community Gallery
      </Title>
      <Text c="dimmed">
        Discover amazing astrophotography from our community
      </Text>
    </Container>
  );
}
