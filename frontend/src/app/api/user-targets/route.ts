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

  const userTargets = await prisma.userTarget.findMany({
    where,
    include: {
      target: true,
    },
    orderBy: { lastShotAt: 'desc' },
  });

  return NextResponse.json(userTargets);
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
