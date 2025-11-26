/*
  Warnings:

  - You are about to drop the column `endTime` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `search_vector` on the `Target` table. All the data in the column will be lost.
  - Added the required column `date` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Session_startTime_idx";

-- DropIndex
DROP INDEX "idx_targets_catalog_id_trgm";

-- DropIndex
DROP INDEX "idx_targets_constellation_magnitude";

-- DropIndex
DROP INDEX "idx_targets_dec_deg";

-- DropIndex
DROP INDEX "idx_targets_ic_id";

-- DropIndex
DROP INDEX "idx_targets_messier_id_trgm";

-- DropIndex
DROP INDEX "idx_targets_name";

-- DropIndex
DROP INDEX "idx_targets_name_asc";

-- DropIndex
DROP INDEX "idx_targets_name_trgm";

-- DropIndex
DROP INDEX "idx_targets_other_names";

-- DropIndex
DROP INDEX "idx_targets_ra_deg";

-- DropIndex
DROP INDEX "idx_targets_search_vector";

-- DropIndex
DROP INDEX "idx_targets_size_desc";

-- DropIndex
DROP INDEX "idx_targets_size_major";

-- DropIndex
DROP INDEX "idx_targets_type_constellation";

-- DropIndex
DROP INDEX "idx_targets_type_magnitude";

-- DropIndex
DROP INDEX "idx_targets_type_size";

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "endTime",
DROP COLUMN "startTime",
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Target" DROP COLUMN "search_vector";

-- CreateTable
CREATE TABLE "ImageProcessingJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "errorDetails" TEXT,
    "extractedMetadata" JSONB,
    "targetId" TEXT,
    "targetMatch" TEXT,
    "targetName" TEXT,
    "ra" DOUBLE PRECISION,
    "dec" DOUBLE PRECISION,
    "exposureTime" DOUBLE PRECISION,
    "totalIntegration" DOUBLE PRECISION,
    "filter" TEXT,
    "captureDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "imageUploadId" TEXT,

    CONSTRAINT "ImageProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImageProcessingJob_imageUploadId_key" ON "ImageProcessingJob"("imageUploadId");

-- CreateIndex
CREATE INDEX "ImageProcessingJob_userId_idx" ON "ImageProcessingJob"("userId");

-- CreateIndex
CREATE INDEX "ImageProcessingJob_status_idx" ON "ImageProcessingJob"("status");

-- CreateIndex
CREATE INDEX "ImageProcessingJob_createdAt_idx" ON "ImageProcessingJob"("createdAt");

-- CreateIndex
CREATE INDEX "Session_date_idx" ON "Session"("date");

-- AddForeignKey
ALTER TABLE "ImageProcessingJob" ADD CONSTRAINT "ImageProcessingJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageProcessingJob" ADD CONSTRAINT "ImageProcessingJob_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageProcessingJob" ADD CONSTRAINT "ImageProcessingJob_imageUploadId_fkey" FOREIGN KEY ("imageUploadId") REFERENCES "ImageUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;
