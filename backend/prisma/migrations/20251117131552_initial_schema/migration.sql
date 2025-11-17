-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "username" TEXT NOT NULL,
    "bio" TEXT,
    "location" TEXT,
    "website" TEXT,
    "profileVisibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Telescope" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "focalLengthMm" DOUBLE PRECISION NOT NULL,
    "apertureMm" DOUBLE PRECISION NOT NULL,
    "focalRatio" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "Telescope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Camera" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "sensorWidthMm" DOUBLE PRECISION NOT NULL,
    "sensorHeightMm" DOUBLE PRECISION NOT NULL,
    "resolutionX" INTEGER NOT NULL,
    "resolutionY" INTEGER NOT NULL,
    "pixelSizeUm" DOUBLE PRECISION NOT NULL,
    "sensorType" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "Camera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "telescopeId" TEXT NOT NULL,
    "cameraId" TEXT NOT NULL,
    "reducerFactor" DOUBLE PRECISION DEFAULT 1.0,
    "barlowFactor" DOUBLE PRECISION DEFAULT 1.0,
    "rotationDegDefault" DOUBLE PRECISION DEFAULT 0.0,

    CONSTRAINT "Rig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Target" (
    "id" TEXT NOT NULL,
    "catalogId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "raDeg" DOUBLE PRECISION NOT NULL,
    "decDeg" DOUBLE PRECISION NOT NULL,
    "sizeMajorArcmin" DOUBLE PRECISION,
    "sizeMinorArcmin" DOUBLE PRECISION,
    "magnitude" DOUBLE PRECISION,
    "constellation" TEXT,

    CONSTRAINT "Target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTarget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WISHLIST',
    "rating" INTEGER,
    "notes" TEXT,
    "firstShotAt" TIMESTAMP(3),
    "lastShotAt" TIMESTAMP(3),
    "timesShot" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locationName" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "moonPhasePercent" DOUBLE PRECISION,
    "seeingEstimate" TEXT,
    "notes" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionTarget" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "rigId" TEXT,
    "planned" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "SessionTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageUpload" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "sessionId" TEXT,
    "rigId" TEXT,
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "title" TEXT,
    "description" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "exposureTimeSec" DOUBLE PRECISION,
    "totalIntegrationMin" DOUBLE PRECISION,
    "filter" TEXT,
    "isoGain" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "ImageUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Telescope_userId_idx" ON "Telescope"("userId");

-- CreateIndex
CREATE INDEX "Camera_userId_idx" ON "Camera"("userId");

-- CreateIndex
CREATE INDEX "Rig_userId_idx" ON "Rig"("userId");

-- CreateIndex
CREATE INDEX "Rig_telescopeId_idx" ON "Rig"("telescopeId");

-- CreateIndex
CREATE INDEX "Rig_cameraId_idx" ON "Rig"("cameraId");

-- CreateIndex
CREATE UNIQUE INDEX "Target_catalogId_key" ON "Target"("catalogId");

-- CreateIndex
CREATE INDEX "Target_catalogId_idx" ON "Target"("catalogId");

-- CreateIndex
CREATE INDEX "Target_type_idx" ON "Target"("type");

-- CreateIndex
CREATE INDEX "Target_constellation_idx" ON "Target"("constellation");

-- CreateIndex
CREATE INDEX "UserTarget_userId_idx" ON "UserTarget"("userId");

-- CreateIndex
CREATE INDEX "UserTarget_targetId_idx" ON "UserTarget"("targetId");

-- CreateIndex
CREATE INDEX "UserTarget_status_idx" ON "UserTarget"("status");

-- CreateIndex
CREATE UNIQUE INDEX "UserTarget_userId_targetId_key" ON "UserTarget"("userId", "targetId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_startTime_idx" ON "Session"("startTime");

-- CreateIndex
CREATE INDEX "SessionTarget_sessionId_idx" ON "SessionTarget"("sessionId");

-- CreateIndex
CREATE INDEX "SessionTarget_targetId_idx" ON "SessionTarget"("targetId");

-- CreateIndex
CREATE INDEX "SessionTarget_rigId_idx" ON "SessionTarget"("rigId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionTarget_sessionId_targetId_key" ON "SessionTarget"("sessionId", "targetId");

-- CreateIndex
CREATE INDEX "ImageUpload_userId_idx" ON "ImageUpload"("userId");

-- CreateIndex
CREATE INDEX "ImageUpload_targetId_idx" ON "ImageUpload"("targetId");

-- CreateIndex
CREATE INDEX "ImageUpload_sessionId_idx" ON "ImageUpload"("sessionId");

-- CreateIndex
CREATE INDEX "ImageUpload_visibility_uploadedAt_idx" ON "ImageUpload"("visibility", "uploadedAt");

-- CreateIndex
CREATE INDEX "ImageUpload_featured_idx" ON "ImageUpload"("featured");

-- AddForeignKey
ALTER TABLE "Telescope" ADD CONSTRAINT "Telescope_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Camera" ADD CONSTRAINT "Camera_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rig" ADD CONSTRAINT "Rig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rig" ADD CONSTRAINT "Rig_telescopeId_fkey" FOREIGN KEY ("telescopeId") REFERENCES "Telescope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rig" ADD CONSTRAINT "Rig_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTarget" ADD CONSTRAINT "UserTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTarget" ADD CONSTRAINT "UserTarget_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionTarget" ADD CONSTRAINT "SessionTarget_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionTarget" ADD CONSTRAINT "SessionTarget_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionTarget" ADD CONSTRAINT "SessionTarget_rigId_fkey" FOREIGN KEY ("rigId") REFERENCES "Rig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageUpload" ADD CONSTRAINT "ImageUpload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageUpload" ADD CONSTRAINT "ImageUpload_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageUpload" ADD CONSTRAINT "ImageUpload_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageUpload" ADD CONSTRAINT "ImageUpload_rigId_fkey" FOREIGN KEY ("rigId") REFERENCES "Rig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
