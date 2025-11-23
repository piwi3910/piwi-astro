import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/cache/redis';
import { getUserId } from '@/lib/auth/api-auth';

const MAX_HISTORY_ITEMS = 5;
const MIN_SEARCH_LENGTH = 2;

function getHistoryKey(userId: string, type: string): string {
  return `search-history:${type}:${userId}`;
}

export async function GET(request: Request) {
  const { userId, error } = await getUserId();
  if (error || !userId) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'targets';

  const redis = getRedisClient();
  if (!redis) {
    return NextResponse.json([]);
  }

  try {
    const key = getHistoryKey(userId, type);
    const history = await redis.lrange(key, 0, MAX_HISTORY_ITEMS - 1);
    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching search history:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  const { userId, error } = await getUserId();
  if (error || !userId) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { term, type = 'targets' } = await request.json();

    // Validate search term
    if (!term || typeof term !== 'string' || term.trim().length < MIN_SEARCH_LENGTH) {
      return NextResponse.json(
        { error: `Search term must be at least ${MIN_SEARCH_LENGTH} characters` },
        { status: 400 }
      );
    }

    const redis = getRedisClient();
    if (!redis) {
      return NextResponse.json({ success: true, history: [] });
    }

    const key = getHistoryKey(userId, type);
    const searchTerm = term.trim();

    // Remove existing occurrence (if any) to avoid duplicates
    await redis.lrem(key, 0, searchTerm);

    // Add to front of list
    await redis.lpush(key, searchTerm);

    // Trim to keep only last 5 items
    await redis.ltrim(key, 0, MAX_HISTORY_ITEMS - 1);

    // Return updated history
    const history = await redis.lrange(key, 0, MAX_HISTORY_ITEMS - 1);

    return NextResponse.json({ success: true, history });
  } catch (error) {
    console.error('Error saving search history:', error);
    return NextResponse.json(
      { error: 'Failed to save search history' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const { userId, error } = await getUserId();
  if (error || !userId) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const term = searchParams.get('term');
  const type = searchParams.get('type') || 'targets';

  const redis = getRedisClient();
  if (!redis) {
    return NextResponse.json({ success: true, history: [] });
  }

  try {
    const key = getHistoryKey(userId, type);

    if (term) {
      // Remove specific term
      await redis.lrem(key, 0, term);
    } else {
      // Clear all history
      await redis.del(key);
    }

    // Return updated history
    const history = await redis.lrange(key, 0, MAX_HISTORY_ITEMS - 1);

    return NextResponse.json({ success: true, history });
  } catch (error) {
    console.error('Error deleting search history:', error);
    return NextResponse.json(
      { error: 'Failed to delete search history' },
      { status: 500 }
    );
  }
}
