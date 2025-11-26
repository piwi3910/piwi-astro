import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/api-auth';

const sessionSchema = z.object({
  name: z.string().min(1),
  locationName: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  date: z.string().datetime(),
  moonPhasePercent: z.number().optional(),
  seeingEstimate: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  const { userId, error } = await getUserId();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const where: {
    userId: string;
    date?: {
      gte?: Date;
      lte?: Date;
    };
  } = {
    userId,
  };

  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }

  // Check if pagination is requested
  const hasPagination = searchParams.has('page') || searchParams.has('pageSize');

  if (!hasPagination) {
    // Backward compatibility: return all items if no pagination params
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
        date: 'desc',
      },
    });
    return NextResponse.json(sessions);
  }

  // Parse and validate pagination params
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)), 100);
  const skip = (page - 1) * pageSize;

  // Fetch total count and paginated data in parallel
  const [total, sessions] = await Promise.all([
    prisma.session.count({ where }),
    prisma.session.findMany({
      where,
      skip,
      take: pageSize,
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
        date: 'desc',
      },
    }),
  ]);

  return NextResponse.json({
    data: sessions,
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
    const data = sessionSchema.parse(body);

    const newSession = await prisma.session.create({
      data: {
        ...data,
        date: new Date(data.date),
        userId,
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
