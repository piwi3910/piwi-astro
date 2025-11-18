import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { authOptions } from '@/lib/auth';

const cameraSchema = z.object({
  name: z.string().min(1).max(100),
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  sensorWidthMm: z.number().positive(),
  sensorHeightMm: z.number().positive(),
  resolutionX: z.number().int().positive(),
  resolutionY: z.number().int().positive(),
  pixelSizeUm: z.number().positive(),
  sensorType: z.string().max(50),
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

  const camera = await prisma.camera.findFirst({
    where: { id, userId: (session.user as { id: string }).id },
  });

  if (!camera) {
    return NextResponse.json({ error: 'Camera not found' }, { status: 404 });
  }

  return NextResponse.json(camera);
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
    const data = cameraSchema.parse(body);

    const existing = await prisma.camera.findFirst({
      where: { id, userId: (session.user as { id: string }).id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Camera not found' }, { status: 404 });
    }

    const camera = await prisma.camera.update({
      where: { id },
      data,
    });

    return NextResponse.json(camera);
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

  const existing = await prisma.camera.findFirst({
    where: { id, userId: (session.user as { id: string }).id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Camera not found' }, { status: 404 });
  }

  await prisma.camera.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
