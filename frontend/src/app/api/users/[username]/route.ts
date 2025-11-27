import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getPresignedUrl } from '@/lib/minio';

export async function GET(
  _request: Request,
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
      images: {
        where: {
          visibility: 'PUBLIC',
        },
        include: {
          target: true,
        },
        orderBy: [
          { featured: 'desc' },
          { viewCount: 'desc' },
          { uploadedAt: 'desc' },
        ],
        take: 50,
      },
      _count: {
        select: {
          images: {
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

  // Generate presigned URLs for images
  const imagesWithUrls = await Promise.all(
    user.images.map(async (image) => {
      const url = await getPresignedUrl(image.storageKey);
      return {
        ...image,
        url,
      };
    })
  );

  return NextResponse.json({
    ...user,
    images: imagesWithUrls,
    publicImageCount: user._count.images,
  });
}
