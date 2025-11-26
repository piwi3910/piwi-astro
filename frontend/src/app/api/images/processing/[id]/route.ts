import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/api-auth';
import { deleteFile } from '@/lib/minio';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await getUserId();
  if (error) return error;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const job = await prisma.imageProcessingJob.findFirst({
    where: { id, userId },
    include: {
      target: {
        select: {
          id: true,
          catalogId: true,
          name: true,
          type: true,
          constellation: true,
          magnitude: true,
        },
      },
      imageUpload: {
        select: {
          id: true,
          url: true,
          thumbnailUrl: true,
          visibility: true,
          title: true,
        },
      },
    },
  });

  if (!job) {
    return NextResponse.json(
      { error: 'Processing job not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(job);
}

export async function DELETE(
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

  // Delete associated image upload if exists
  if (job.imageUploadId) {
    await prisma.imageUpload.delete({
      where: { id: job.imageUploadId },
    });
  }

  // Delete file from MinIO if job is not completed
  // (completed jobs have their files referenced by ImageUpload)
  if (job.status !== 'COMPLETED') {
    try {
      await deleteFile(job.storageKey);
    } catch (deleteError) {
      console.warn('Error deleting file from storage:', deleteError);
      // Continue with job deletion even if file deletion fails
    }
  }

  // Delete the processing job
  await prisma.imageProcessingJob.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
