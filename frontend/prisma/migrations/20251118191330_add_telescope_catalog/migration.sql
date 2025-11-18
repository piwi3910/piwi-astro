-- AlterTable
ALTER TABLE "Telescope" ADD COLUMN     "catalogId" TEXT;

-- CreateTable
CREATE TABLE "TelescopeCatalog" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "apertureMm" DOUBLE PRECISION NOT NULL,
    "focalLengthMm" DOUBLE PRECISION NOT NULL,
    "focalRatio" DOUBLE PRECISION NOT NULL,
    "externalId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelescopeCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TelescopeCatalog_brand_idx" ON "TelescopeCatalog"("brand");

-- CreateIndex
CREATE INDEX "TelescopeCatalog_model_idx" ON "TelescopeCatalog"("model");

-- CreateIndex
CREATE INDEX "TelescopeCatalog_isActive_idx" ON "TelescopeCatalog"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TelescopeCatalog_brand_model_apertureMm_focalLengthMm_key" ON "TelescopeCatalog"("brand", "model", "apertureMm", "focalLengthMm");

-- CreateIndex
CREATE INDEX "Telescope_catalogId_idx" ON "Telescope"("catalogId");

-- AddForeignKey
ALTER TABLE "Telescope" ADD CONSTRAINT "Telescope_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "TelescopeCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
