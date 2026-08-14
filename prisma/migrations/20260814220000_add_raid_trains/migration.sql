-- CreateEnum
CREATE TYPE "RaidTrainPullStatus" AS ENUM ('EARMARKED', 'SOLD', 'RELEASED');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "raidTrainPullId" TEXT;

-- CreateTable
CREATE TABLE "RaidTrain" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "raidDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaidTrain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaidTrainPull" (
    "id" TEXT NOT NULL,
    "raidTrainId" TEXT NOT NULL,
    "bucketId" TEXT NOT NULL,
    "bundleQuantity" INTEGER NOT NULL DEFAULT 1,
    "bundlePrice" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "carriedCogsPerItem" DECIMAL(10,2) NOT NULL,
    "status" "RaidTrainPullStatus" NOT NULL DEFAULT 'EARMARKED',
    "pulledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaidTrainPull_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RaidTrain_raidDate_idx" ON "RaidTrain"("raidDate");

-- CreateIndex
CREATE INDEX "RaidTrainPull_raidTrainId_idx" ON "RaidTrainPull"("raidTrainId");

-- CreateIndex
CREATE INDEX "RaidTrainPull_bucketId_idx" ON "RaidTrainPull"("bucketId");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_raidTrainPullId_key" ON "Sale"("raidTrainPullId");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_raidTrainPullId_fkey" FOREIGN KEY ("raidTrainPullId") REFERENCES "RaidTrainPull"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidTrainPull" ADD CONSTRAINT "RaidTrainPull_raidTrainId_fkey" FOREIGN KEY ("raidTrainId") REFERENCES "RaidTrain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidTrainPull" ADD CONSTRAINT "RaidTrainPull_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "CategoryBucket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
