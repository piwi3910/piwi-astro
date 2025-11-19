import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/api-auth';
import { calculateFOV } from '@/utils/fov';

const rigSchema = z.object({
  name: z.string().min(1).max(100),
  telescopeId: z.string().uuid(),
  cameraId: z.string().uuid(),
  reducerFactor: z.number().positive().optional().default(1.0),
  barlowFactor: z.number().positive().optional().default(1.0),
  rotationDegDefault: z.number().min(0).max(360).optional().default(0),
});

export async function GET(request: Request) {
  const { userId, error } = await getUserId();
  if (error) return error;

  const { searchParams } = new URL(request.url);

  // Check if pagination is requested
  const hasPagination = searchParams.has('page') || searchParams.has('pageSize');

  if (!hasPagination) {
    // Backward compatibility: return all items if no pagination params
    const rigs = await prisma.rig.findMany({
      where: { userId },
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

  // Parse and validate pagination params
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)), 100);
  const skip = (page - 1) * pageSize;

  // Fetch total count and paginated data in parallel
  const [total, rigs] = await Promise.all([
    prisma.rig.count({ where: { userId } }),
    prisma.rig.findMany({
      where: { userId },
      skip,
      take: pageSize,
      include: { telescope: true, camera: true },
      orderBy: { name: 'asc' },
    }),
  ]);

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

  return NextResponse.json({
    data: rigsWithFOV,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

export async function POST(request: Request) {
  const { userId, error } = await getUserId();
  if (error) return error;

  try {
    const body = await request.json();
    const data = rigSchema.parse(body);

    const [telescope, camera] = await Promise.all([
      prisma.telescope.findFirst({
        where: { id: data.telescopeId, userId },
      }),
      prisma.camera.findFirst({
        where: { id: data.cameraId, userId },
      }),
    ]);

    if (!telescope) {
      return NextResponse.json({ error: 'Telescope not found' }, { status: 400 });
    }
    if (!camera) {
      return NextResponse.json({ error: 'Camera not found' }, { status: 400 });
    }

    const rig = await prisma.rig.create({
      data: { ...data, userId },
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
