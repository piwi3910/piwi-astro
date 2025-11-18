import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const brand = searchParams.get('brand');
  const search = searchParams.get('search') || '';
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    // Get unique brands
    if (type === 'brands') {
      const brands = await prisma.telescopeCatalog.findMany({
        where: { isActive: true },
        select: { brand: true },
        distinct: ['brand'],
        orderBy: { brand: 'asc' },
      });

      return NextResponse.json({
        brands: brands.map((b) => b.brand),
      });
    }

    // Get models for a specific brand or search
    const where: any = { isActive: true };

    if (brand) {
      where.brand = brand;
    }

    if (search) {
      where.OR = [
        { brand: { contains: search, mode: 'insensitive' as const } },
        { model: { contains: search, mode: 'insensitive' as const } },
      ];
    }

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
