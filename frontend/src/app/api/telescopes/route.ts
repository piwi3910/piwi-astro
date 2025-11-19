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

export async function GET() {
  const { userId, error } = await getUserId();
  if (error) return error;

  const telescopes = await prisma.telescope.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(telescopes);
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
