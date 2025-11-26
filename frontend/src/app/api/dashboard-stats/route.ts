import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth/api-auth';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/dashboard-stats
 *
 * Returns aggregated statistics for the dashboard using efficient count queries.
 * This endpoint replaces multiple individual API calls with a single optimized request
 * using Prisma's count() method instead of fetching entire lists.
 *
 * Response:
 * {
 *   telescopes: number,
 *   cameras: number,
 *   rigs: number,
 *   locations: number,
 *   targets: number,           // total user-targets count
 *   targetsWishlist: number,   // WISHLIST status
 *   targetsShot: number,       // SHOT status
 *   targetsProcessed: number,  // PROCESSED status
 *   sessions: number,          // total sessions
 *   sessionsUpcoming: number,  // sessions in the future
 *   images: number,            // total images
 *   imagesPublic: number       // PUBLIC visibility
 * }
 */
export async function GET() {
  const { userId, error } = await getUserId();
  if (error || !userId) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();

  // Run all count queries in parallel for maximum performance
  const [
    telescopes,
    cameras,
    rigs,
    locations,
    targets,
    targetsWishlist,
    targetsShot,
    targetsProcessed,
    sessions,
    sessionsUpcoming,
    images,
    imagesPublic,
  ] = await Promise.all([
    prisma.telescope.count({ where: { userId } }),
    prisma.camera.count({ where: { userId } }),
    prisma.rig.count({ where: { userId } }),
    prisma.location.count({ where: { userId } }),
    prisma.userTarget.count({ where: { userId } }),
    prisma.userTarget.count({ where: { userId, status: 'WISHLIST' } }),
    prisma.userTarget.count({ where: { userId, status: 'SHOT' } }),
    prisma.userTarget.count({ where: { userId, status: 'PROCESSED' } }),
    prisma.session.count({ where: { userId } }),
    prisma.session.count({ where: { userId, date: { gte: now } } }),
    prisma.imageUpload.count({ where: { userId } }),
    prisma.imageUpload.count({ where: { userId, visibility: 'PUBLIC' } }),
  ]);

  return NextResponse.json({
    telescopes,
    cameras,
    rigs,
    locations,
    targets,
    targetsWishlist,
    targetsShot,
    targetsProcessed,
    sessions,
    sessionsUpcoming,
    images,
    imagesPublic,
  });
}
