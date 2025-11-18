import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { authOptions } from '@/lib/auth';

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

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const telescopes = await prisma.telescope.findMany({
    where: { userId: (session.user as { id: string }).id },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(telescopes);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = telescopeSchema.parse(body);

    const telescope = await prisma.telescope.create({
      data: {
        ...data,
        userId: (session.user as { id: string }).id,
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
