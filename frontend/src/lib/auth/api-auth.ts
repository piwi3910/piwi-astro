import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Authentication utility for API routes
 * Per Next.js 16 security recommendations, authentication is handled at the data access layer
 */

export async function requireAuth() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return {
      authenticated: false,
      session: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return {
    authenticated: true,
    session,
    error: null,
  };
}

// Discriminated union for proper type narrowing
type GetUserIdResult =
  | { userId: string; error: null }
  | { userId: null; error: NextResponse };

export async function getUserId(): Promise<GetUserIdResult> {
  const { authenticated, session, error } = await requireAuth();

  if (!authenticated || !session) {
    return { userId: null, error: error! };
  }

  // Extract userId from session
  const userId = session.user.id;

  if (!userId) {
    return {
      userId: null,
      error: NextResponse.json({ error: 'User ID not found in session' }, { status: 500 }),
    };
  }

  return { userId, error: null };
}
