-- AlterTable
ALTER TABLE "Camera" ADD COLUMN     "catalogId" TEXT;

-- CreateTable
CREATE TABLE "CameraCatalog" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "pixelSizeUm" DOUBLE PRECISION NOT NULL,
    "resolutionX" INTEGER NOT NULL,
    "resolutionY" INTEGER NOT NULL,
    "sensorWidthMm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sensorHeightMm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "externalId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CameraCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CameraCatalog_brand_idx" ON "CameraCatalog"("brand");

-- CreateIndex
CREATE INDEX "CameraCatalog_model_idx" ON "CameraCatalog"("model");

-- CreateIndex
CREATE INDEX "CameraCatalog_isActive_idx" ON "CameraCatalog"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CameraCatalog_brand_model_pixelSizeUm_resolutionX_resolutio_key" ON "CameraCatalog"("brand", "model", "pixelSizeUm", "resolutionX", "resolutionY");

-- CreateIndex
CREATE INDEX "Camera_catalogId_idx" ON "Camera"("catalogId");

-- AddForeignKey
ALTER TABLE "Camera" ADD CONSTRAINT "Camera_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "CameraCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
