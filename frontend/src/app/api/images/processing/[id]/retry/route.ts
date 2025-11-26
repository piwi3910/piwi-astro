import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/api-auth';
import { scheduleImageProcessing } from '@/lib/queue/queues';

export async function POST(
  _request: Request,
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

  // Only allow retry for failed jobs
  if (job.status !== 'FAILED') {
    return NextResponse.json(
      { error: 'Can only retry failed jobs' },
      { status: 400 }
    );
  }

  // Reset job status
  await prisma.imageProcessingJob.update({
    where: { id },
    data: {
      status: 'PENDING',
      errorMessage: null,
      errorDetails: null,
      updatedAt: new Date(),
    },
  });

  // Re-queue the job
  await scheduleImageProcessing({
    jobId: job.id,
    userId: job.userId,
    storageKey: job.storageKey,
    originalName: job.originalName,
  });

  return NextResponse.json({
    success: true,
    message: 'Job has been re-queued for processing',
  });
}
