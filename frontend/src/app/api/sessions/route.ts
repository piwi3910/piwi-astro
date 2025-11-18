import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { authOptions } from '@/lib/auth';

const sessionSchema = z.object({
  name: z.string().min(1),
  locationName: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  moonPhasePercent: z.number().optional(),
  seeingEstimate: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const where: {
    userId: string;
    startTime?: {
      gte?: Date;
      lte?: Date;
    };
  } = {
    userId: (session.user as { id: string }).id,
  };

  if (from || to) {
    where.startTime = {};
    if (from) where.startTime.gte = new Date(from);
    if (to) where.startTime.lte = new Date(to);
  }

  const sessions = await prisma.session.findMany({
    where,
    include: {
      sessionTargets: {
        include: {
          target: true,
        },
        orderBy: {
          priority: 'desc',
        },
      },
    },
    orderBy: {
      startTime: 'desc',
    },
  });

  return NextResponse.json(sessions);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = sessionSchema.parse(body);

    const newSession = await prisma.session.create({
      data: {
        ...data,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        userId: (session.user as { id: string }).id,
      },
      include: {
        sessionTargets: {
          include: {
            target: true,
          },
        },
      },
    });

    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    throw error;
  }
}
