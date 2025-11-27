'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Container } from '@/components/ui/container';
import { Text } from '@/components/ui/text';
import { Loader } from '@/components/ui/loader';
import { Stack } from '@/components/ui/stack';

/**
 * Client-side authentication guard component
 * Per Next.js 16 security recommendations, this provides immediate redirect
 * while API routes handle the actual authentication enforcement
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <Container size="xl" className="py-8">
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
