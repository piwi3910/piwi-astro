import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const where = search
      ? {
          isActive: true,
          OR: [
            { brand: { contains: search, mode: 'insensitive' as const } },
            { model: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : { isActive: true };

    const [telescopes, total] = await Promise.all([
      prisma.telescopeCatalog.findMany({
        where,
        orderBy: [{ brand: 'asc' }, { model: 'asc' }],
        take: limit,
        skip: offset,
      }),
      prisma.telescopeCatalog.count({ where }),
    ]);

    return NextResponse.json({
      telescopes,
      total,
      hasMore: offset + telescopes.length < total,
    });
  } catch (error) {
    console.error('Failed to fetch telescope catalog:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
