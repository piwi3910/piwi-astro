import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { authOptions } from '@/lib/auth';

const updateSessionSchema = z.object({
  startTime: z.string().datetime().optional(),
  location: z.string().min(1).optional(),
  conditions: z.string().optional(),
  notes: z.string().optional(),
}).partial();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existingSession = await prisma.session.findFirst({
    where: {
      id,
      userId: (session.user as { id: string }).id,
    },
    include: {
      sessionTargets: {
        include: {
          target: true,
        },
        orderBy: {
          priority: 'desc',
        },
      },
    },
  });

  if (!existingSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json(existingSession);
}

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
    const data = updateSessionSchema.parse(body);

    const existing = await prisma.session.findFirst({
      where: {
        id,
        userId: (session.user as { id: string }).id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const updateData: typeof data & { date?: Date } = { ...data };
    if (data.startTime) {
      updateData.date = new Date(data.startTime);
    }

    const updatedSession = await prisma.session.update({
      where: { id },
      data: updateData,
      include: {
        sessionTargets: {
          include: {
            target: true,
          },
          orderBy: {
            priority: 'desc',
          },
        },
      },
    });

    return NextResponse.json(updatedSession);
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

  const existing = await prisma.session.findFirst({
    where: {
      id,
      userId: (session.user as { id: string }).id,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  await prisma.session.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
