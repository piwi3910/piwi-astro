import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { authOptions } from '@/lib/auth';

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
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const favorites = searchParams.get('favorites');

  const where: { userId: string; isFavorite?: boolean } = {
    userId: (session.user as { id: string }).id,
  };

  if (favorites === 'true') {
    where.isFavorite = true;
  }

  const locations = await prisma.location.findMany({
    where,
    orderBy: [
      { isFavorite: 'desc' },
      { name: 'asc' },
    ],
  });

  return NextResponse.json(locations);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createLocationSchema.parse(body);

    const location = await prisma.location.create({
      data: {
        userId: (session.user as { id: string }).id,
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
