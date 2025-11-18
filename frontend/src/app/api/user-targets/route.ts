import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { authOptions } from '@/lib/auth';

const userTargetSchema = z.object({
  targetId: z.string().uuid(),
  status: z.enum(['WISHLIST', 'PLANNED', 'SHOT', 'PROCESSED']).optional().default('WISHLIST'),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || '';

  const where = {
    userId: (session.user as { id: string }).id,
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
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = userTargetSchema.parse(body);

    // Check if already exists
    const existing = await prisma.userTarget.findUnique({
      where: {
        userId_targetId: {
          userId: (session.user as { id: string }).id,
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
        userId: (session.user as { id: string }).id,
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
