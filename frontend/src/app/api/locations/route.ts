import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/api-auth';

const createLocationSchema = z.object({
  name: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  bortleScale: z.number().min(1).max(9).optional().nullable(),
  elevation: z.number().optional().nullable(),
  timezone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isFavorite: z.boolean().optional(),
});

export async function GET(request: Request) {
  const { userId, error } = await getUserId();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const favorites = searchParams.get('favorites');

  const where: { userId: string; isFavorite?: boolean } = {
    userId,
  };

  if (favorites === 'true') {
    where.isFavorite = true;
  }

  // Check if pagination is requested
  const hasPagination = searchParams.has('page') || searchParams.has('pageSize');

  if (!hasPagination) {
    // Backward compatibility: return all items if no pagination params
    const locations = await prisma.location.findMany({
      where,
      orderBy: [
        { isFavorite: 'desc' },
        { name: 'asc' },
      ],
    });
    return NextResponse.json(locations);
  }

  // Parse and validate pagination params
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)), 100);
  const skip = (page - 1) * pageSize;

  // Fetch total count and paginated data in parallel
  const [total, locations] = await Promise.all([
    prisma.location.count({ where }),
    prisma.location.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [
        { isFavorite: 'desc' },
        { name: 'asc' },
      ],
    }),
  ]);

  return NextResponse.json({
    data: locations,
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
    const data = createLocationSchema.parse(body);

    const location = await prisma.location.create({
      data: {
        userId,
        ...data,
      },
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error creating location:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
