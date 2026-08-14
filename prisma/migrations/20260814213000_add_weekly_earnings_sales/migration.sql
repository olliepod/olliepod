-- CreateEnum
CREATE TYPE "SaleKind" AS ENUM ('ITEM_SALE', 'GIVEAWAY');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('PENDING', 'RECONCILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "SaleImport" (
    "id" TEXT NOT NULL,
    "reportStartDate" TIMESTAMP(3) NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "fileName" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "saleImportId" TEXT NOT NULL,
    "ledgerTransactionId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "listingTitle" TEXT NOT NULL,
    "livestreamTitle" TEXT,
    "quantitySold" INTEGER NOT NULL DEFAULT 1,
    "transactionCompletedAt" TIMESTAMP(3) NOT NULL,
    "originalItemPrice" DECIMAL(10,2) NOT NULL,
    "commissionFee" DECIMAL(10,2) NOT NULL,
    "paymentProcessingFee" DECIMAL(10,2) NOT NULL,
    "transactionAmount" DECIMAL(10,2) NOT NULL,
    "buyerName" TEXT,
    "buyerState" TEXT,
    "kind" "SaleKind" NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT 'PENDING',
    "show" "BucketShow",
    "itemType" "ItemType",
    "tagStatus" "TagStatus",
    "bucketId" TEXT,
    "cogsAmount" DECIMAL(10,2),
    "profitAmount" DECIMAL(10,2),
    "reconciledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sale_ledgerTransactionId_key" ON "Sale"("ledgerTransactionId");

-- CreateIndex
CREATE INDEX "Sale_saleImportId_idx" ON "Sale"("saleImportId");

-- CreateIndex
CREATE INDEX "Sale_status_idx" ON "Sale"("status");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_saleImportId_fkey" FOREIGN KEY ("saleImportId") REFERENCES "SaleImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "CategoryBucket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
