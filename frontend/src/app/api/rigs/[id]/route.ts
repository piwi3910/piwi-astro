import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { authOptions } from '@/lib/auth';
import { calculateFOV } from '@/utils/fov';

const rigSchema = z.object({
  name: z.string().min(1).max(100),
  telescopeId: z.string().uuid(),
  cameraId: z.string().uuid(),
  reducerFactor: z.number().positive(),
  barlowFactor: z.number().positive(),
  rotationDegDefault: z.number().min(0).max(360),
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

  const rig = await prisma.rig.findFirst({
    where: { id, userId: (session.user as { id: string }).id },
    include: { telescope: true, camera: true },
  });

  if (!rig) {
    return NextResponse.json({ error: 'Rig not found' }, { status: 404 });
  }

  const fov = calculateFOV(
    rig.telescope.focalLengthMm,
    rig.camera.sensorWidthMm,
    rig.camera.sensorHeightMm,
    rig.camera.pixelSizeUm,
    rig.reducerFactor || 1.0,
    rig.barlowFactor || 1.0
  );

  return NextResponse.json({ ...rig, fov });
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
    const data = rigSchema.parse(body);

    const existing = await prisma.rig.findFirst({
      where: { id, userId: (session.user as { id: string }).id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Rig not found' }, { status: 404 });
    }

    if (data.telescopeId) {
      const telescope = await prisma.telescope.findFirst({
        where: { id: data.telescopeId, userId: (session.user as { id: string }).id },
      });
      if (!telescope) {
        return NextResponse.json({ error: 'Telescope not found' }, { status: 400 });
      }
    }

    if (data.cameraId) {
      const camera = await prisma.camera.findFirst({
        where: { id: data.cameraId, userId: (session.user as { id: string }).id },
      });
      if (!camera) {
        return NextResponse.json({ error: 'Camera not found' }, { status: 400 });
      }
    }

    const rig = await prisma.rig.update({
      where: { id },
      data,
      include: { telescope: true, camera: true },
    });

    const fov = calculateFOV(
      rig.telescope.focalLengthMm,
      rig.camera.sensorWidthMm,
      rig.camera.sensorHeightMm,
      rig.camera.pixelSizeUm,
      rig.reducerFactor || 1.0,
      rig.barlowFactor || 1.0
    );

    return NextResponse.json({ ...rig, fov });
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

  const existing = await prisma.rig.findFirst({
    where: { id, userId: (session.user as { id: string }).id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Rig not found' }, { status: 404 });
  }

  await prisma.rig.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
