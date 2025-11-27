import './globals.css';
import { Providers } from './providers';

// Force dynamic rendering to avoid SSR/prerender issues with React hooks
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'piwi-astro - Astrophotography Planning & Portfolio',
  description: 'Plan your astrophotography sessions and showcase your work',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
