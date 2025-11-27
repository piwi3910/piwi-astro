import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/api-auth';
import { imageProcessingQueue } from '@/lib/queue/queues';

export async function POST(
  __request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await getUserId();
  if (error) return error;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

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

  // Allow retry for failed and needs_target jobs
  if (job.status !== 'FAILED' && job.status !== 'NEEDS_TARGET') {
    return NextResponse.json(
      { error: 'Can only retry failed or needs-target jobs' },
      { status: 400 }
    );
  }

  // Remove any existing BullMQ job with the same ID to allow re-queuing
  const bullmqJobId = `process-image-${job.id}`;
  const existingJob = await imageProcessingQueue.getJob(bullmqJobId);
  if (existingJob) {
    await existingJob.remove();
  }

  // Reset job status and clear previous results
  await prisma.imageProcessingJob.update({
    where: { id },
    data: {
      status: 'PENDING',
      errorMessage: null,
      errorDetails: null,
      targetId: null,
      targetMatch: null,
      ra: null,
      dec: null,
      updatedAt: new Date(),
    },
  });

  // Re-queue the job
  await imageProcessingQueue.add(
    'process-image',
    {
      jobId: job.id,
      userId: job.userId,
      storageKey: job.storageKey,
      originalName: job.originalName,
    },
    {
      jobId: bullmqJobId,
    }
  );

  return NextResponse.json({
    success: true,
    message: 'Job has been re-queued for processing',
  });
}
