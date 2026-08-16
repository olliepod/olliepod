-- CreateTable
CREATE TABLE "SaleBundleComponent" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "bucketId" TEXT NOT NULL,
    "show" "BucketShow",
    "itemType" "ItemType" NOT NULL,
    "tagStatus" "TagStatus" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "cogsAmount" DECIMAL(10,2) NOT NULL,
    "revenueAmount" DECIMAL(10,2) NOT NULL,
    "profitAmount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleBundleComponent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SaleBundleComponent_saleId_idx" ON "SaleBundleComponent"("saleId");

-- CreateIndex
CREATE INDEX "SaleBundleComponent_bucketId_idx" ON "SaleBundleComponent"("bucketId");

-- AddForeignKey
ALTER TABLE "SaleBundleComponent" ADD CONSTRAINT "SaleBundleComponent_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleBundleComponent" ADD CONSTRAINT "SaleBundleComponent_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "CategoryBucket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
