import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/api-auth';

const telescopeSchema = z.object({
  name: z.string().min(1).max(100),
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  focalLengthMm: z.number().positive(),
  apertureMm: z.number().positive(),
  focalRatio: z.number().positive().optional(),
  notes: z.string().optional(),
}).partial();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await getUserId();
  if (error) return error;

  const { id } = await params;

  const telescope = await prisma.telescope.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!telescope) {
    return NextResponse.json({ error: 'Telescope not found' }, { status: 404 });
  }

  return NextResponse.json(telescope);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await getUserId();
  if (error) return error;

  const { id } = await params;

  try {
    const body = await request.json();
    const data = telescopeSchema.parse(body);

    // Check ownership
    const existing = await prisma.telescope.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Telescope not found' }, { status: 404 });
    }

    const telescope = await prisma.telescope.update({
      where: { id },
      data,
    });

    return NextResponse.json(telescope);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    throw error;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await getUserId();
  if (error) return error;

  const { id } = await params;

  // Check ownership
  const existing = await prisma.telescope.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Telescope not found' }, { status: 404 });
  }

  await prisma.telescope.delete({
    where: { id },
  });

  return new NextResponse(null, { status: 204 });
}
