import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/api-auth';

const telescopeSchema = z.object({
  catalogId: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  focalLengthMm: z.number().positive(),
  apertureMm: z.number().positive(),
  focalRatio: z.number().positive().optional(),
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
    const telescopes = await prisma.telescope.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(telescopes);
  }

  // Parse and validate pagination params
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)), 100);
  const skip = (page - 1) * pageSize;

  // Fetch total count and paginated data in parallel
  const [total, telescopes] = await Promise.all([
    prisma.telescope.count({ where: { userId } }),
    prisma.telescope.findMany({
      where: { userId },
      skip,
      take: pageSize,
      orderBy: { name: 'asc' },
    }),
  ]);

  return NextResponse.json({
    data: telescopes,
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
    const data = telescopeSchema.parse(body);

    const telescope = await prisma.telescope.create({
      data: {
        ...data,
        userId,
      },
    });

    return NextResponse.json(telescope, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    throw error;
  }
}
