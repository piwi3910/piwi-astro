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

export async function GET(request: Request) {
  const { userId, error } = await getUserId();
  if (error) return error;

  const { searchParams } = new URL(request.url);

  // Check if pagination is requested
  const hasPagination = searchParams.has('page') || searchParams.has('pageSize');

  if (!hasPagination) {
    // Backward compatibility: return all items if no pagination params
    const cameras = await prisma.camera.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(cameras);
  }

  // Parse and validate pagination params
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)), 100);
  const skip = (page - 1) * pageSize;

  // Fetch total count and paginated data in parallel
  const [total, cameras] = await Promise.all([
    prisma.camera.count({ where: { userId } }),
    prisma.camera.findMany({
      where: { userId },
      skip,
      take: pageSize,
      orderBy: { name: 'asc' },
    }),
  ]);

  return NextResponse.json({
    data: cameras,
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
