-- AlterTable
ALTER TABLE "SessionTarget" ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0;
