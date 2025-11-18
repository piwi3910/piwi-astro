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
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cameras = await prisma.camera.findMany({
    where: { userId: (session.user as { id: string }).id },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(cameras);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = cameraSchema.parse(body);

    const camera = await prisma.camera.create({
      data: {
        ...data,
        userId: (session.user as { id: string }).id,
      },
    });

    return NextResponse.json(camera, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    throw error;
  }
}
