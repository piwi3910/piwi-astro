import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/api-auth';

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
  const { userId, error } = await getUserId();
  if (error) return error;

  const cameras = await prisma.camera.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(cameras);
}

export async function POST(request: Request) {
  const { userId, error } = await getUserId();
  if (error) return error;

  try {
    const body = await request.json();
    const data = cameraSchema.parse(body);

    const camera = await prisma.camera.create({
      data: {
        ...data,
        userId,
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
