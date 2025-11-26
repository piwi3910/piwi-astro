import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/api-auth';
import { getPresignedUrl } from '@/lib/minio';

const completeJobSchema = z.object({
  targetId: z.string().uuid(),
  title: z.string().optional(),
  description: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED']).optional().default('PRIVATE'),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await getUserId();
  if (error) return error;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Validate request body
  let body;
  try {
    body = completeJobSchema.parse(await request.json());
  } catch (parseError) {
    if (parseError instanceof z.ZodError) {
      return NextResponse.json({ error: parseError.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Find the job
  const job = await prisma.imageProcessingJob.findFirst({
    where: { id, userId },
  });

  if (!job) {
    return NextResponse.json(
      { error: 'Processing job not found' },
      { status: 404 }
    );
  }

  // Verify the target exists
  const target = await prisma.target.findUnique({
    where: { id: body.targetId },
  });

  if (!target) {
    return NextResponse.json(
      { error: 'Target not found' },
      { status: 404 }
    );
  }

  // Create ImageUpload record
  const url = await getPresignedUrl(job.storageKey);

  const imageUpload = await prisma.imageUpload.create({
    data: {
      userId,
      targetId: body.targetId,
      storageKey: job.storageKey,
      url,
      visibility: body.visibility,
      title: body.title || job.targetName || job.originalName,
      description: body.description,
      exposureTimeSec: job.exposureTime,
      totalIntegrationMin: job.totalIntegration,
      filter: job.filter,
    },
  });

  // Update UserTarget status if exists
  await prisma.userTarget.updateMany({
    where: {
      userId,
      targetId: body.targetId,
      status: { in: ['WISHLIST', 'PLANNED'] },
    },
    data: {
      status: 'SHOT',
      lastShotAt: new Date(),
      timesShot: { increment: 1 },
    },
  });

  // Mark job as completed
  await prisma.imageProcessingJob.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      targetId: body.targetId,
      targetMatch: 'MANUAL',
      imageUploadId: imageUpload.id,
      completedAt: new Date(),
      errorMessage: null,
      errorDetails: null,
    },
  });

  return NextResponse.json({
    success: true,
    imageUpload: {
      id: imageUpload.id,
      url: imageUpload.url,
      targetId: body.targetId,
    },
  });
}
