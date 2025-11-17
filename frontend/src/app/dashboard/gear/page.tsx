'use client';

import { Container, Title, Tabs, Stack } from '@mantine/core';
import { TelescopesTab } from '@/components/gear/TelescopesTab';
import { CamerasTab } from '@/components/gear/CamerasTab';
import { RigsTab } from '@/components/gear/RigsTab';

export default function GearPage(): JSX.Element {
  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Title order={1}>Gear Management</Title>

        <Tabs defaultValue="telescopes">
          <Tabs.List>
            <Tabs.Tab value="telescopes">Telescopes</Tabs.Tab>
            <Tabs.Tab value="cameras">Cameras</Tabs.Tab>
            <Tabs.Tab value="rigs">Rigs</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="telescopes" pt="md">
            <TelescopesTab />
          </Tabs.Panel>

          <Tabs.Panel value="cameras" pt="md">
            <CamerasTab />
          </Tabs.Panel>

          <Tabs.Panel value="rigs" pt="md">
            <RigsTab />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
