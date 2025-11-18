import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { authOptions } from '@/lib/auth';

const updateSessionTargetSchema = z.object({
  priority: z.number().int().min(0).optional(),
  duration: z.number().int().min(1).optional(),
  notes: z.string().optional(),
}).partial();

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

    if (existing.session.userId !== (session.user as { id: string }).id) {
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
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  if (existing.session.userId !== (session.user as { id: string }).id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  await prisma.sessionTarget.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
