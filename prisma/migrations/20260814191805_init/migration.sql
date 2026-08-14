-- CreateEnum
CREATE TYPE "BucketShow" AS ENUM ('TORRID_LB', 'RANDOM_3', 'RANDOM_5_8', 'EBAY', 'DEALS_STEALS');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('TOP', 'BOTTOM', 'DRESS', 'JEANS_SHORTS', 'BRA', 'LINGERIE', 'OTHER');

-- CreateEnum
CREATE TYPE "TagStatus" AS ENUM ('PREOWNED', 'NWT');

-- CreateEnum
CREATE TYPE "HaulChannel" AS ENUM ('GOODWILL_BINS', 'THRIFT', 'VINTED', 'WHATNOT_SOURCE');

-- CreateEnum
CREATE TYPE "SortDestination" AS ENUM ('EBAY', 'TORRID_LB', 'RANDOM_3', 'PERSONAL', 'NEEDS_WASH', 'TRASH');

-- CreateEnum
CREATE TYPE "TransferReason" AS ENUM ('DEALS_STEALS_MARKDOWN');

-- CreateTable
CREATE TABLE "CategoryBucket" (
    "id" TEXT NOT NULL,
    "show" "BucketShow",
    "itemType" "ItemType" NOT NULL,
    "tagStatus" "TagStatus" NOT NULL,
    "countOnHand" INTEGER NOT NULL DEFAULT 0,
    "totalCogs" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StartingCountEntry" (
    "id" TEXT NOT NULL,
    "bucketId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "totalCogs" DECIMAL(10,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StartingCountEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Haul" (
    "id" TEXT NOT NULL,
    "channel" "HaulChannel" NOT NULL,
    "haulDate" TIMESTAMP(3) NOT NULL,
    "totalCost" DECIMAL(10,2),
    "notes" TEXT,
    "finalized" BOOLEAN NOT NULL DEFAULT false,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Haul_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HaulSortEntry" (
    "id" TEXT NOT NULL,
    "haulId" TEXT NOT NULL,
    "destination" "SortDestination" NOT NULL,
    "itemType" "ItemType",
    "tagStatus" "TagStatus",
    "quantity" INTEGER NOT NULL,
    "cogsPerItem" DECIMAL(10,2),
    "bucketId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HaulSortEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeedsWashQueueItem" (
    "id" TEXT NOT NULL,
    "haulId" TEXT NOT NULL,
    "itemTypeGuess" "ItemType",
    "quantityRemaining" INTEGER NOT NULL,
    "cogsPerItem" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NeedsWashQueueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResolvedNeedsWashUnit" (
    "id" TEXT NOT NULL,
    "queueItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "bucketId" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResolvedNeedsWashUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLine" (
    "id" TEXT NOT NULL,
    "haulId" TEXT NOT NULL,
    "show" "BucketShow" NOT NULL,
    "itemType" "ItemType" NOT NULL,
    "tagStatus" "TagStatus" NOT NULL,
    "bundleQuantity" INTEGER NOT NULL DEFAULT 1,
    "bundlePrice" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "bucketId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "haulId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "fileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BucketTransferLog" (
    "id" TEXT NOT NULL,
    "reason" "TransferReason" NOT NULL,
    "fromBucketId" TEXT NOT NULL,
    "toBucketId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "cogsAmount" DECIMAL(10,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BucketTransferLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryBucket_itemType_tagStatus_idx" ON "CategoryBucket"("itemType", "tagStatus");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryBucket_show_itemType_tagStatus_key" ON "CategoryBucket"("show", "itemType", "tagStatus");

-- CreateIndex
CREATE INDEX "Haul_channel_haulDate_idx" ON "Haul"("channel", "haulDate");

-- CreateIndex
CREATE INDEX "HaulSortEntry_haulId_idx" ON "HaulSortEntry"("haulId");

-- CreateIndex
CREATE INDEX "NeedsWashQueueItem_haulId_idx" ON "NeedsWashQueueItem"("haulId");

-- CreateIndex
CREATE INDEX "ResolvedNeedsWashUnit_queueItemId_idx" ON "ResolvedNeedsWashUnit"("queueItemId");

-- CreateIndex
CREATE INDEX "OrderLine_haulId_idx" ON "OrderLine"("haulId");

-- CreateIndex
CREATE INDEX "Receipt_haulId_idx" ON "Receipt"("haulId");

-- CreateIndex
CREATE INDEX "BucketTransferLog_fromBucketId_idx" ON "BucketTransferLog"("fromBucketId");

-- CreateIndex
CREATE INDEX "BucketTransferLog_toBucketId_idx" ON "BucketTransferLog"("toBucketId");

-- AddForeignKey
ALTER TABLE "StartingCountEntry" ADD CONSTRAINT "StartingCountEntry_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "CategoryBucket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HaulSortEntry" ADD CONSTRAINT "HaulSortEntry_haulId_fkey" FOREIGN KEY ("haulId") REFERENCES "Haul"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HaulSortEntry" ADD CONSTRAINT "HaulSortEntry_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "CategoryBucket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeedsWashQueueItem" ADD CONSTRAINT "NeedsWashQueueItem_haulId_fkey" FOREIGN KEY ("haulId") REFERENCES "Haul"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResolvedNeedsWashUnit" ADD CONSTRAINT "ResolvedNeedsWashUnit_queueItemId_fkey" FOREIGN KEY ("queueItemId") REFERENCES "NeedsWashQueueItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResolvedNeedsWashUnit" ADD CONSTRAINT "ResolvedNeedsWashUnit_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "CategoryBucket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_haulId_fkey" FOREIGN KEY ("haulId") REFERENCES "Haul"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "CategoryBucket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_haulId_fkey" FOREIGN KEY ("haulId") REFERENCES "Haul"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BucketTransferLog" ADD CONSTRAINT "BucketTransferLog_fromBucketId_fkey" FOREIGN KEY ("fromBucketId") REFERENCES "CategoryBucket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BucketTransferLog" ADD CONSTRAINT "BucketTransferLog_toBucketId_fkey" FOREIGN KEY ("toBucketId") REFERENCES "CategoryBucket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
