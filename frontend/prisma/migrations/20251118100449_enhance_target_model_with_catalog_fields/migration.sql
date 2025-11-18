-- AlterTable
ALTER TABLE "Target" ADD COLUMN     "catalogSource" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "icId" TEXT,
ADD COLUMN     "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "messierId" TEXT,
ADD COLUMN     "ngcId" TEXT,
ADD COLUMN     "otherNames" TEXT,
ADD COLUMN     "previewImageUrl" TEXT,
ADD COLUMN     "subType" TEXT,
ADD COLUMN     "surfaceBrightness" DOUBLE PRECISION,
ADD COLUMN     "thumbnailUrl" TEXT;

-- CreateIndex
CREATE INDEX "Target_messierId_idx" ON "Target"("messierId");

-- CreateIndex
CREATE INDEX "Target_ngcId_idx" ON "Target"("ngcId");

-- CreateIndex
CREATE INDEX "Target_magnitude_idx" ON "Target"("magnitude");
