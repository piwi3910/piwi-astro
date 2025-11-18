import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { authOptions } from '@/lib/auth';

const updateUserTargetSchema = z.object({
  status: z.enum(['WISHLIST', 'PLANNED', 'SHOT', 'PROCESSED']).optional(),
  rating: z.number().int().min(1).max(5).optional(),
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
    const data = updateUserTargetSchema.parse(body);

    const existing = await prisma.userTarget.findFirst({
      where: {
        id,
        userId: (session.user as { id: string }).id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'User target not found' }, { status: 404 });
    }

    // Update shot timestamps if status is changing to SHOT
    const updateData: typeof data & { firstShotAt?: Date; lastShotAt?: Date; timesShot?: number } = { ...data };
    if (data.status === 'SHOT' && existing.status !== 'SHOT') {
      updateData.lastShotAt = new Date();
      if (!existing.firstShotAt) {
        updateData.firstShotAt = new Date();
      }
      updateData.timesShot = existing.timesShot + 1;
    }

    const userTarget = await prisma.userTarget.update({
      where: { id },
      data: updateData,
      include: { target: true },
    });

    return NextResponse.json(userTarget);
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

  const existing = await prisma.userTarget.findFirst({
    where: {
      id,
      userId: (session.user as { id: string }).id,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'User target not found' }, { status: 404 });
  }

  await prisma.userTarget.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
