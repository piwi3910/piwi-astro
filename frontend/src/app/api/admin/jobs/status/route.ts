/**
 * API endpoint to view job status and queue statistics
 */
import { NextResponse } from 'next/server';
import { catalogUpdateQueue } from '@/lib/queue/queues';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    // If specific job ID requested, return that job's status
    if (jobId) {
      const job = await catalogUpdateQueue.getJob(jobId);

      if (!job) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }

      const state = await job.getState();
      const progress = job.progress;

      return NextResponse.json({
        jobId: job.id,
        name: job.name,
        state,
        progress,
        data: job.data,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      });
    }

    // Otherwise, return queue statistics
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      catalogUpdateQueue.getWaitingCount(),
      catalogUpdateQueue.getActiveCount(),
      catalogUpdateQueue.getCompletedCount(),
      catalogUpdateQueue.getFailedCount(),
      catalogUpdateQueue.getDelayedCount(),
    ]);

    // Get recent jobs
    const recentJobs = await catalogUpdateQueue.getJobs(
      ['completed', 'failed', 'active', 'waiting'],
      0,
      10
    );

    const jobs = await Promise.all(
      recentJobs.map(async (job) => ({
        id: job.id,
        name: job.name,
        state: await job.getState(),
        progress: job.progress,
        timestamp: job.timestamp,
        finishedOn: job.finishedOn,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason,
      }))
    );

    return NextResponse.json({
      queueStats: {
        waiting,
        active,
        completed,
        failed,
        delayed,
      },
      recentJobs: jobs,
    });
  } catch (error) {
    console.error('Error fetching job status:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch job status',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
