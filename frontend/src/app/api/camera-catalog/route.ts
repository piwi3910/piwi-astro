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
      const brands = await prisma.cameraCatalog.findMany({
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

    const [cameras, total] = await Promise.all([
      prisma.cameraCatalog.findMany({
        where,
        orderBy: [{ brand: 'asc' }, { model: 'asc' }],
        take: limit,
        skip: offset,
      }),
      prisma.cameraCatalog.count({ where }),
    ]);

    return NextResponse.json({
      cameras,
      total,
      hasMore: offset + cameras.length < total,
    });
  } catch (error) {
    console.error('Failed to fetch camera catalog:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
