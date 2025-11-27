import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/api-auth';

// POST /api/images/[id]/download - Increment download count
export async function POST(
  __request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId: authenticatedUserId } = await getUserId();

  const image = await prisma.imageUpload.findUnique({
    where: { id },
    select: { id: true, userId: true, visibility: true, downloadCount: true },
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

  // Increment download count (even for owner)
  const updated = await prisma.imageUpload.update({
    where: { id },
    data: { downloadCount: { increment: 1 } },
    select: { downloadCount: true },
  });

  return NextResponse.json({ downloadCount: updated.downloadCount });
}
