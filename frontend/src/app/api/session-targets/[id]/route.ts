import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/api-auth';

const updateSessionTargetSchema = z.object({
  priority: z.number().int().min(0).optional(),
  duration: z.number().int().min(1).optional(),
  notes: z.string().optional(),
}).partial();

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await getUserId();
  if (error) return error;

  const { id } = await params;

  try {
    const body = await request.json();
    const data = updateSessionTargetSchema.parse(body);

    // Verify ownership through session
    const existing = await prisma.sessionTarget.findUnique({
      where: { id },
      include: {
        session: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Session target not found' }, { status: 404 });
    }

    if (existing.session.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const sessionTarget = await prisma.sessionTarget.update({
      where: { id },
      data,
      include: {
        target: true,
      },
    });

    return NextResponse.json(sessionTarget);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    throw error;
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await getUserId();
  if (error) return error;

  const { id } = await params;

  // Verify ownership through session
  const existing = await prisma.sessionTarget.findUnique({
    where: { id },
    include: {
      session: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Session target not found' }, { status: 404 });
  }

  if (existing.session.userId !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const targetId = existing.targetId;

  await prisma.sessionTarget.delete({ where: { id } });

  // Check if this target is still in any other sessions
  const remainingSessionTargets = await prisma.sessionTarget.findFirst({
    where: {
      targetId,
      session: {
        userId,
      },
    },
  });

  // If not in any other sessions, revert user target status from PLANNED to WISHLIST
  if (!remainingSessionTargets) {
    await prisma.userTarget.updateMany({
      where: {
        userId,
        targetId,
        status: 'PLANNED',
      },
      data: {
        status: 'WISHLIST',
      },
    });
  }

  return new NextResponse(null, { status: 204 });
}
