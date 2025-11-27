'use client';

import { Container } from '@/components/ui/container';
import { Title } from '@/components/ui/title';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Stack } from '@/components/ui/stack';
import { TelescopesTab } from '@/components/gear/TelescopesTab';
import { CamerasTab } from '@/components/gear/CamerasTab';
import { RigsTab } from '@/components/gear/RigsTab';

export default function GearPage() {
  return (
    <Container size="xl" className="py-8">
      <Stack gap="lg">
        <Title order={1}>Gear Management</Title>

        <Tabs defaultValue="telescopes">
          <TabsList>
            <TabsTrigger value="telescopes">Telescopes</TabsTrigger>
            <TabsTrigger value="cameras">Cameras</TabsTrigger>
            <TabsTrigger value="rigs">Rigs</TabsTrigger>
          </TabsList>

          <TabsContent value="telescopes" className="pt-4">
            <TelescopesTab />
          </TabsContent>

          <TabsContent value="cameras" className="pt-4">
            <CamerasTab />
          </TabsContent>

          <TabsContent value="rigs" className="pt-4">
            <RigsTab />
          </TabsContent>
        </Tabs>
      </Stack>
    </Container>
  );
}
