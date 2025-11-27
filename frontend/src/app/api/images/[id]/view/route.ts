import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/api-auth';

// POST /api/images/[id]/view - Increment view count
export async function POST(
  __request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId: authenticatedUserId } = await getUserId();

  const image = await prisma.imageUpload.findUnique({
    where: { id },
    select: { id: true, userId: true, visibility: true, viewCount: true },
  });

  if (!image) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }

  // Check permissions
  const isOwner = authenticatedUserId && image.userId === authenticatedUserId;
  const isPublic = image.visibility === 'PUBLIC';

  if (!isPublic && !isOwner) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Increment view count for all users (including owner)
  const updated = await prisma.imageUpload.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
    select: { viewCount: true },
  });

  return NextResponse.json({ viewCount: updated.viewCount });
}
