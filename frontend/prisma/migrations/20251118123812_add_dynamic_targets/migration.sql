-- AlterTable
ALTER TABLE "Target" ADD COLUMN     "caldwellId" TEXT,
ADD COLUMN     "isDynamic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "solarSystemBody" TEXT,
ALTER COLUMN "raDeg" SET DEFAULT 0,
ALTER COLUMN "decDeg" SET DEFAULT 0;
