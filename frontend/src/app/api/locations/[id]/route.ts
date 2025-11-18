import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { authOptions } from '@/lib/auth';

const updateLocationSchema = z.object({
  name: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  bortleScale: z.number().min(1).max(9).optional().nullable(),
  elevation: z.number().optional().nullable(),
  timezone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isFavorite: z.boolean().optional(),
}).partial();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const location = await prisma.location.findUnique({
    where: { id },
  });

  if (!location) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 });
  }

  // Verify ownership
  if (location.userId !== (session.user as { id: string }).id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(location);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    // Check if location exists and user owns it
    const existing = await prisma.location.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    if (existing.userId !== (session.user as { id: string }).id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const data = updateLocationSchema.parse(body);

    const location = await prisma.location.update({
      where: { id },
      data,
    });

    return NextResponse.json(location);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error updating location:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  // Check if location exists and user owns it
  const existing = await prisma.location.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 });
  }

  if (existing.userId !== (session.user as { id: string }).id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.location.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
