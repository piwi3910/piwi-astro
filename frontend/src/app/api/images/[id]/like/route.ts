import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/api-auth';

// GET /api/images/[id]/like - Check if user has liked the image
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await getUserId();

  if (!userId) {
    return NextResponse.json({ liked: false, likeCount: 0 });
  }

  const [like, image] = await Promise.all([
    prisma.imageLike.findUnique({
      where: {
        userId_imageId: {
          userId,
          imageId: id,
        },
      },
    }),
    prisma.imageUpload.findUnique({
      where: { id },
      select: {
        _count: {
          select: { likes: true },
        },
      },
    }),
  ]);

  return NextResponse.json({
    liked: !!like,
    likeCount: image?._count.likes ?? 0,
  });
}

// POST /api/images/[id]/like - Like an image
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId, error } = await getUserId();
  if (error) return error;

  // Check if image exists and is accessible
  const image = await prisma.imageUpload.findUnique({
    where: { id },
    select: { id: true, userId: true, visibility: true },
  });

  if (!image) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }

  // Check permissions - can like public images or own images
  const isOwner = image.userId === userId;
  const isPublic = image.visibility === 'PUBLIC';

  if (!isPublic && !isOwner) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Create like (upsert to handle race conditions)
  await prisma.imageLike.upsert({
    where: {
      userId_imageId: {
        userId: userId!,
        imageId: id,
      },
    },
    create: {
      userId: userId!,
      imageId: id,
    },
    update: {},
  });

  // Get updated like count
  const likeCount = await prisma.imageLike.count({
    where: { imageId: id },
  });

  return NextResponse.json({ liked: true, likeCount });
}

// DELETE /api/images/[id]/like - Unlike an image
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId, error } = await getUserId();
  if (error) return error;

  // Delete like if it exists
  await prisma.imageLike.deleteMany({
    where: {
      userId: userId!,
      imageId: id,
    },
  });

  // Get updated like count
  const likeCount = await prisma.imageLike.count({
    where: { imageId: id },
  });

  return NextResponse.json({ liked: false, likeCount });
}
