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
  reducerFactor: z.number().positive().optional().default(1.0),
  barlowFactor: z.number().positive().optional().default(1.0),
  rotationDegDefault: z.number().min(0).max(360).optional().default(0),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rigs = await prisma.rig.findMany({
    where: { userId: (session.user as { id: string }).id },
    include: { telescope: true, camera: true },
    orderBy: { name: 'asc' },
  });

  const rigsWithFOV = rigs.map((rig) => {
    const fov = calculateFOV(
      rig.telescope.focalLengthMm,
      rig.camera.sensorWidthMm,
      rig.camera.sensorHeightMm,
      rig.camera.pixelSizeUm,
      rig.reducerFactor || 1.0,
      rig.barlowFactor || 1.0
    );

    return {
      ...rig,
      pixelScale: fov.pixelScaleArcsecPerPixel,
      fovWidthArcmin: fov.fovWidthArcmin,
      fovHeightArcmin: fov.fovHeightArcmin,
    };
  });

  return NextResponse.json(rigsWithFOV);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = rigSchema.parse(body);

    const [telescope, camera] = await Promise.all([
      prisma.telescope.findFirst({
        where: { id: data.telescopeId, userId: (session.user as { id: string }).id },
      }),
      prisma.camera.findFirst({
        where: { id: data.cameraId, userId: (session.user as { id: string }).id },
      }),
    ]);

    if (!telescope) {
      return NextResponse.json({ error: 'Telescope not found' }, { status: 400 });
    }
    if (!camera) {
      return NextResponse.json({ error: 'Camera not found' }, { status: 400 });
    }

    const rig = await prisma.rig.create({
      data: { ...data, userId: (session.user as { id: string }).id },
      include: { telescope: true, camera: true },
    });

    const fov = calculateFOV(
      telescope.focalLengthMm,
      camera.sensorWidthMm,
      camera.sensorHeightMm,
      camera.pixelSizeUm,
      rig.reducerFactor || 1.0,
      rig.barlowFactor || 1.0
    );

    return NextResponse.json(
      {
        ...rig,
        pixelScale: fov.pixelScaleArcsecPerPixel,
        fovWidthArcmin: fov.fovWidthArcmin,
        fovHeightArcmin: fov.fovHeightArcmin,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    throw error;
  }
}
