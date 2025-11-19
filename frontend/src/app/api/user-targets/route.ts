import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/api-auth';

const userTargetSchema = z.object({
  targetId: z.string().uuid(),
  status: z.enum(['WISHLIST', 'PLANNED', 'SHOT', 'PROCESSED']).optional().default('WISHLIST'),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  const { userId, error } = await getUserId();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || '';

  const where = {
    userId,
    ...(status && { status }),
  };

  // Check if pagination is requested
  const hasPagination = searchParams.has('page') || searchParams.has('pageSize');

  if (!hasPagination) {
    // Backward compatibility: return all items if no pagination params
    const userTargets = await prisma.userTarget.findMany({
      where,
      include: {
        target: true,
      },
      orderBy: { lastShotAt: 'desc' },
    });
    return NextResponse.json(userTargets);
  }

  // Parse and validate pagination params
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)), 100);
  const skip = (page - 1) * pageSize;

  // Fetch total count and paginated data in parallel
  const [total, userTargets] = await Promise.all([
    prisma.userTarget.count({ where }),
    prisma.userTarget.findMany({
      where,
      skip,
      take: pageSize,
      include: {
        target: true,
      },
      orderBy: { lastShotAt: 'desc' },
    }),
  ]);

  return NextResponse.json({
    data: userTargets,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

export async function POST(request: Request) {
  const { userId, error } = await getUserId();
  if (error) return error;

  try {
    const body = await request.json();
    const data = userTargetSchema.parse(body);

    // Check if already exists
    const existing = await prisma.userTarget.findUnique({
      where: {
        userId_targetId: {
          userId,
          targetId: data.targetId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Target already in your list' }, { status: 400 });
    }

    const userTarget = await prisma.userTarget.create({
      data: {
        ...data,
        userId,
      },
      include: {
        target: true,
      },
    });

    return NextResponse.json(userTarget, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    throw error;
  }
}
