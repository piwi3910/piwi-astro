import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/api-auth';
import { uploadFileWithUUID } from '@/lib/minio';
import { scheduleImageProcessing } from '@/lib/queue/queues';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB for PNG/JPEG files
const VALID_EXTENSIONS = ['.png', '.jpg', '.jpeg'];

interface UploadResult {
  jobId: string;
  fileName: string;
  status: 'queued' | 'error';
  error?: string;
}

export async function POST(request: Request) {
  const { userId, error } = await getUserId();
  if (error) return error;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    const results: UploadResult[] = [];

    for (const file of files) {
      const fileName = file.name.toLowerCase();

      // Validate file type
      const hasValidExtension = VALID_EXTENSIONS.some((ext) =>
        fileName.endsWith(ext)
      );

      if (!hasValidExtension) {
        results.push({
          jobId: '',
          fileName: file.name,
          status: 'error',
          error: `Invalid file type. Only PNG and JPEG files are supported.`,
        });
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        results.push({
          jobId: '',
          fileName: file.name,
          status: 'error',
          error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
        });
        continue;
      }

      try {
        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Determine content type and extension
        const ext = fileName.substring(fileName.lastIndexOf('.'));
        const contentType = fileName.endsWith('.png')
          ? 'image/png'
          : 'image/jpeg';

        // Upload to MinIO with UUID-only key
        const storageKey = await uploadFileWithUUID(buffer, ext, contentType);

        // Create processing job record in database
        const processingJob = await prisma.imageProcessingJob.create({
          data: {
            userId,
            storageKey,
            originalName: file.name,
            fileSize: file.size,
            status: 'PENDING',
          },
        });

        // Queue the processing job
        await scheduleImageProcessing({
          jobId: processingJob.id,
          userId,
          storageKey,
          originalName: file.name,
        });

        results.push({
          jobId: processingJob.id,
          fileName: file.name,
          status: 'queued',
        });
      } catch (uploadError) {
        console.error(`Error uploading ${file.name}:`, uploadError);
        results.push({
          jobId: '',
          fileName: file.name,
          status: 'error',
          error:
            uploadError instanceof Error
              ? uploadError.message
              : 'Upload failed',
        });
      }
    }

    // Return summary
    const queued = results.filter((r) => r.status === 'queued').length;
    const errors = results.filter((r) => r.status === 'error').length;

    return NextResponse.json(
      {
        message: `${queued} file(s) queued for processing${errors > 0 ? `, ${errors} failed` : ''}`,
        results,
        summary: {
          total: files.length,
          queued,
          errors,
        },
      },
      { status: errors === files.length ? 400 : 201 }
    );
  } catch (error) {
    console.error('Error processing upload:', error);
    return NextResponse.json(
      {
        error: 'Failed to process upload',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
