'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Container, Text, Loader, Stack } from '@mantine/core';

/**
 * Client-side authentication guard component
 * Per Next.js 16 security recommendations, this provides immediate redirect
 * while API routes handle the actual authentication enforcement
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text>Loading...</Text>
        </Stack>
      </Container>
    );
  }

  if (status === 'unauthenticated') {
    return null; // Will redirect
  }

  return <>{children}</>;
}
