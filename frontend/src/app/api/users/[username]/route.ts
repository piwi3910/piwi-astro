import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getPresignedUrl } from '@/lib/minio';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      bio: true,
      avatarUrl: true,
      profileVisibility: true,
      createdAt: true,
      imageUploads: {
        where: {
          visibility: 'PUBLIC',
        },
        include: {
          target: true,
        },
        orderBy: [
          { featured: 'desc' },
          { viewCount: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 50,
      },
      _count: {
        select: {
          imageUploads: {
            where: {
              visibility: 'PUBLIC',
            },
          },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (user.profileVisibility !== 'PUBLIC') {
    return NextResponse.json({ error: 'Profile is private' }, { status: 403 });
  }

  // Generate presigned URLs for images (even public ones get presigned URLs for consistency)
  const imagesWithUrls = await Promise.all(
    user.imageUploads.map(async (image) => {
      const url = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET_NAME || 'astroplanner-images'}/${image.s3Key}`;
      return {
        ...image,
        url,
      };
    })
  );

  return NextResponse.json({
    ...user,
    imageUploads: imagesWithUrls,
    publicImageCount: user._count.imageUploads,
  });
}
