import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/api-auth';
import { uploadFile, getPresignedUrl } from '@/lib/minio';

const uploadImageSchema = z.object({
  targetId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  rigId: z.string().uuid().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED']).default('PRIVATE'),
  title: z.string().optional(),
  description: z.string().optional(),
  exposureTime: z.number().optional(),
  integrationTime: z.number().optional(),
  filter: z.string().optional(),
  isoGain: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  // Images can be accessed publicly, so we get userId but don't require auth
  const { userId: authenticatedUserId } = await getUserId();

  const { searchParams } = new URL(request.url);
  const targetId = searchParams.get('targetId');
  const sessionId = searchParams.get('sessionId');
  const visibility = searchParams.get('visibility');
  const userId = searchParams.get('userId');
  const search = searchParams.get('search');
  const type = searchParams.get('type');
  const constellation = searchParams.get('constellation');
  const sortBy = searchParams.get('sortBy') || 'latest'; // latest, mostViewed, mostDownloaded, mostLiked

  // Build where clause based on filters and auth
  const where: {
    targetId?: string;
    sessionId?: string;
    visibility?: string;
    userId?: string;
    OR?: Array<any>;
    AND?: Array<any>;
    target?: {
      type?: string;
      constellation?: string;
    };
  } = {};

  if (targetId) where.targetId = targetId;
  if (sessionId) where.sessionId = sessionId;
  if (visibility) where.visibility = visibility;
  if (userId) where.userId = userId;

  // Target filters
  if (type || constellation) {
    where.target = {};
    if (type) where.target.type = type;
    if (constellation) where.target.constellation = constellation;
  }

  // Search filter (searches title, description, target name, and username)
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { target: { name: { contains: search, mode: 'insensitive' } } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { username: { contains: search, mode: 'insensitive' } } },
    ];
  }

  // If not authenticated, only show public images
  if (!authenticatedUserId) {
    where.visibility = 'PUBLIC';
  } else {
    // If authenticated but no specific filters, show user's images + public images
    if (!userId && !targetId && !sessionId && !visibility) {
      // If we have a search query, combine it with auth filter
      if (search) {
        where.AND = [
          {
            OR: [
              { userId: authenticatedUserId },
              { visibility: 'PUBLIC' },
            ],
          },
          {
            OR: where.OR, // search conditions
          },
        ];
        delete where.OR; // Remove OR from top level since it's in AND now
      } else {
        where.OR = [
          { userId: authenticatedUserId },
          { visibility: 'PUBLIC' },
        ];
      }
    }
  }

  // Build orderBy based on sortBy parameter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orderBy: any;

  switch (sortBy) {
    case 'mostViewed':
      orderBy = [{ viewCount: 'desc' }, { uploadedAt: 'desc' }];
      break;
    case 'mostDownloaded':
      orderBy = [{ downloadCount: 'desc' }, { uploadedAt: 'desc' }];
      break;
    case 'mostLiked':
      orderBy = [{ likes: { _count: 'desc' } }, { uploadedAt: 'desc' }];
      break;
    case 'latest':
    default:
      orderBy = [{ uploadedAt: 'desc' }];
      break;
  }

  // Check if pagination is requested
  const hasPagination = searchParams.has('page') || searchParams.has('pageSize');

  if (!hasPagination) {
    // Backward compatibility: return all items if no pagination params
    const images = await prisma.imageUpload.findMany({
      where,
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
        _count: {
          select: { likes: true },
        },
        // Include likes from current user to check if they liked each image
        likes: authenticatedUserId
          ? {
              where: { userId: authenticatedUserId },
              select: { id: true },
            }
          : false,
      },
      orderBy,
    });

    // Generate presigned URLs for all images
    const imagesWithUrls = await Promise.all(
      images.map(async (image) => {
        const url = await getPresignedUrl(image.storageKey);
        const { _count, likes, ...rest } = image;
        return {
          ...rest,
          url,
          likeCount: _count.likes,
          isLiked: Array.isArray(likes) && likes.length > 0,
        };
      })
    );

    return NextResponse.json(imagesWithUrls);
  }

  // Parse and validate pagination params
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)), 100);
  const skip = (page - 1) * pageSize;

  // Fetch total count and paginated data in parallel
  const [total, images] = await Promise.all([
    prisma.imageUpload.count({ where }),
    prisma.imageUpload.findMany({
      where,
      skip,
      take: pageSize,
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
        _count: {
          select: { likes: true },
        },
        // Include likes from current user to check if they liked each image
        likes: authenticatedUserId
          ? {
              where: { userId: authenticatedUserId },
              select: { id: true },
            }
          : false,
      },
      orderBy,
    }),
  ]);

  // Generate presigned URLs for all images
  const imagesWithUrls = await Promise.all(
    images.map(async (image) => {
      const url = await getPresignedUrl(image.storageKey);
      const { _count, likes, ...rest } = image;
      return {
        ...rest,
        url,
        likeCount: _count.likes,
        isLiked: Array.isArray(likes) && likes.length > 0,
      };
    })
  );

  return NextResponse.json({
    data: imagesWithUrls,
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
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type - only FITS and XISF allowed
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.fits', '.fit', '.fts', '.xisf'];
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

    if (!hasValidExtension) {
      return NextResponse.json(
        { error: 'Invalid file type. Only FITS (.fits, .fit, .fts) and XISF (.xisf) files are supported.' },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large (max 100MB)' }, { status: 400 });
    }

    // Extract metadata from form data
    const metadata = {
      targetId: formData.get('targetId') as string,
      sessionId: formData.get('sessionId') as string | undefined,
      rigId: formData.get('rigId') as string | undefined,
      visibility: formData.get('visibility') as string | undefined,
      title: formData.get('title') as string | undefined,
      description: formData.get('description') as string | undefined,
      exposureTime: formData.get('exposureTime')
        ? parseFloat(formData.get('exposureTime') as string)
        : undefined,
      exposureCount: formData.get('exposureCount')
        ? parseInt(formData.get('exposureCount') as string)
        : undefined,
      iso: formData.get('iso') ? parseInt(formData.get('iso') as string) : undefined,
      focalLength: formData.get('focalLength')
        ? parseFloat(formData.get('focalLength') as string)
        : undefined,
      aperture: formData.get('aperture')
        ? parseFloat(formData.get('aperture') as string)
        : undefined,
    };

    const data = uploadImageSchema.parse(metadata);

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to MinIO
    // Determine content type based on file extension
    const contentType = fileName.endsWith('.xisf')
      ? 'application/xisf'
      : fileName.match(/\.(fits|fit|fts)$/)
      ? 'image/fits'
      : 'application/octet-stream';

    const storageKey = await uploadFile(
      buffer,
      file.name,
      contentType
      // Note: bucketName parameter is optional and defaults to BUCKET_IMAGES
    );

    const url = await getPresignedUrl(storageKey);

    // Save to database
    const imageUpload = await prisma.imageUpload.create({
      data: {
        userId,
        targetId: data.targetId,
        sessionId: data.sessionId || null,
        rigId: data.rigId || null,
        storageKey,
        url,
        visibility: data.visibility || 'PRIVATE',
        title: data.title || null,
        description: data.description || null,
        exposureTimeSec: data.exposureTime || null,
        totalIntegrationMin: data.integrationTime || null,
        filter: data.filter || null,
        isoGain: data.isoGain || null,
        notes: data.notes || null,
      },
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

    return NextResponse.json(imageUpload, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error uploading image:', error);
    throw error;
  }
}
