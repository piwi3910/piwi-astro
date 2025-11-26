import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/carousel/styles.css';
import 'leaflet/dist/leaflet.css';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { Providers } from './providers';

export const metadata = {
  title: 'piwi-astro - Astrophotography Planning & Portfolio',
  description: 'Plan your astrophotography sessions and showcase your work',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body suppressHydrationWarning style={{ background: '#0d1117' }}>
        <MantineProvider forceColorScheme="dark">
          <Notifications />
          <Providers>{children}</Providers>
        </MantineProvider>
      </body>
    </html>
  );
}
