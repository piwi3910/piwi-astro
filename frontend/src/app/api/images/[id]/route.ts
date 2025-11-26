import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/api-auth';
import { getPresignedUrl, deleteFile } from '@/lib/minio';

const updateImageSchema = z.object({
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED']).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  featured: z.boolean().optional(),
  targetId: z.string().uuid().optional(),
  exposureTime: z.number().optional(),
  exposureCount: z.number().int().optional(),
  iso: z.number().int().optional(),
  focalLength: z.number().optional(),
  aperture: z.number().optional(),
}).partial();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Images can be accessed publicly, so we get userId but don't require auth
  const { userId: authenticatedUserId } = await getUserId();

  const image = await prisma.imageUpload.findUnique({
    where: { id },
    include: {
      target: true,
      session: true,
      rig: {
        include: {
          telescope: true,
          camera: true,
        },
      },
      user: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
    },
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
  await prisma.imageUpload.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });

  // Generate presigned URL
  const url = await getPresignedUrl(image.storageKey);

  return NextResponse.json({ ...image, url });
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
    const data = updateImageSchema.parse(body);

    const existing = await prisma.imageUpload.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const updatedImage = await prisma.imageUpload.update({
      where: { id },
      data,
      include: {
        target: true,
        session: true,
        rig: {
          include: {
            telescope: true,
            camera: true,
          },
        },
      },
    });

    // Generate presigned URL
    const url = await getPresignedUrl(updatedImage.storageKey);

    return NextResponse.json({ ...updatedImage, url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    throw error;
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await getUserId();
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.imageUpload.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }

  // Delete from MinIO
  try {
    await deleteFile(existing.storageKey);
  } catch (error) {
    console.error('Error deleting file from MinIO:', error);
    // Continue with database deletion even if MinIO deletion fails
  }

  // Delete from database
  await prisma.imageUpload.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
