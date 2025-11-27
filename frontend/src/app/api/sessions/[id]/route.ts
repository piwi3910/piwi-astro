import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/api-auth';

const updateSessionSchema = z.object({
  date: z.string().datetime().optional(),
  locationName: z.string().min(1).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  notes: z.string().optional(),
}).partial();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await getUserId();
  if (error) return error;

  const { id } = await params;

  const existingSession = await prisma.session.findFirst({
    where: {
      id,
      userId,
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
  const { userId, error } = await getUserId();
  if (error) return error;

  const { id } = await params;

  try {
    const body = await request.json();
    const data = updateSessionSchema.parse(body);

    const existing = await prisma.session.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (data.date) {
      updateData.date = new Date(data.date);
    }
    if (data.locationName !== undefined) updateData.locationName = data.locationName;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.notes !== undefined) updateData.notes = data.notes;

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
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await getUserId();
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.session.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  await prisma.session.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
