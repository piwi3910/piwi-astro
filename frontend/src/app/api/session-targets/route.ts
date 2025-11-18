import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { authOptions } from '@/lib/auth';

const sessionTargetSchema = z.object({
  sessionId: z.string().uuid(),
  targetId: z.string().uuid(),
  priority: z.number().int().min(0).optional().default(0),
  duration: z.number().int().min(1).optional(),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }

  // Verify session ownership
  const sessionOwned = await prisma.session.findFirst({
    where: {
      id: sessionId,
      userId: (session.user as { id: string }).id,
    },
  });

  if (!sessionOwned) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const sessionTargets = await prisma.sessionTarget.findMany({
    where: { sessionId },
    include: {
      target: true,
    },
    orderBy: {
      priority: 'desc',
    },
  });

  return NextResponse.json(sessionTargets);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = sessionTargetSchema.parse(body);

    // Verify session ownership
    const sessionOwned = await prisma.session.findFirst({
      where: {
        id: data.sessionId,
        userId: (session.user as { id: string }).id,
      },
    });

    if (!sessionOwned) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if already exists
    const existing = await prisma.sessionTarget.findUnique({
      where: {
        sessionId_targetId: {
          sessionId: data.sessionId,
          targetId: data.targetId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Target already in this session' },
        { status: 400 }
      );
    }

    const sessionTarget = await prisma.sessionTarget.create({
      data,
      include: {
        target: true,
      },
    });

    return NextResponse.json(sessionTarget, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    throw error;
  }
}
