/**
 * API endpoint to manually trigger background jobs
 */
import { NextResponse } from 'next/server';
import { scheduleUpdateComets, scheduleDataCleanup, scheduleRecurringCometUpdates } from '@/lib/queue/queues';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { jobType, ...params } = body;

    let job;

    switch (jobType) {
      case 'update-comets':
        job = await scheduleUpdateComets(params);
        break;

      case 'cleanup-old-data':
        job = await scheduleDataCleanup(params.daysOld);
        break;

      case 'schedule-recurring-comets':
        job = await scheduleRecurringCometUpdates();
        break;

      default:
        return NextResponse.json(
          { error: `Unknown job type: ${jobType}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      jobType,
      message: `Job ${jobType} scheduled successfully`,
    });
  } catch (error) {
    console.error('Error triggering job:', error);
    return NextResponse.json(
      {
        error: 'Failed to trigger job',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
