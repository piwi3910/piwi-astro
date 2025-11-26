import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/api-auth';

export async function GET(request: Request) {
  const { userId, error } = await getUserId();
  if (error) return error;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  // Build where clause
  const where: {
    userId: string;
    status?: string | { in: string[] };
  } = { userId };

  if (status) {
    if (status === 'processing') {
      // Group processing statuses together
      where.status = { in: ['PENDING', 'EXTRACTING', 'PLATE_SOLVING', 'MATCHING'] };
    } else {
      where.status = status.toUpperCase();
    }
  }

  const [jobs, total] = await Promise.all([
    prisma.imageProcessingJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        target: {
          select: {
            id: true,
            catalogId: true,
            name: true,
            type: true,
          },
        },
        imageUpload: {
          select: {
            id: true,
            url: true,
            thumbnailUrl: true,
          },
        },
      },
    }),
    prisma.imageProcessingJob.count({ where }),
  ]);

  // Get status counts for the user
  const statusCounts = await prisma.imageProcessingJob.groupBy({
    by: ['status'],
    where: { userId },
    _count: true,
  });

  const counts = {
    pending: 0,
    extracting: 0,
    plateSolving: 0,
    matching: 0,
    completed: 0,
    failed: 0,
  };

  statusCounts.forEach((s) => {
    const count = s._count;
    switch (s.status) {
      case 'PENDING':
        counts.pending = count;
        break;
      case 'EXTRACTING':
        counts.extracting = count;
        break;
      case 'PLATE_SOLVING':
        counts.plateSolving = count;
        break;
      case 'MATCHING':
        counts.matching = count;
        break;
      case 'COMPLETED':
        counts.completed = count;
        break;
      case 'FAILED':
        counts.failed = count;
        break;
    }
  });

  return NextResponse.json({
    jobs,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + jobs.length < total,
    },
    counts,
  });
}
