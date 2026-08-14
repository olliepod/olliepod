-- CreateEnum
CREATE TYPE "SaleChannel" AS ENUM ('WHATNOT', 'NIFTY_EBAY');

-- DropIndex
DROP INDEX "Sale_ledgerTransactionId_key";

-- AlterTable
ALTER TABLE "SaleImport" ALTER COLUMN "reportStartDate" DROP NOT NULL,
ALTER COLUMN "weekNumber" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Sale" DROP COLUMN "ledgerTransactionId",
DROP COLUMN "livestreamTitle",
ADD COLUMN     "channel" "SaleChannel" NOT NULL,
ADD COLUMN     "channelDetail" TEXT,
ADD COLUMN     "externalKey" TEXT NOT NULL,
ALTER COLUMN "orderId" DROP NOT NULL,
ALTER COLUMN "originalItemPrice" DROP NOT NULL,
ALTER COLUMN "commissionFee" DROP NOT NULL,
ALTER COLUMN "paymentProcessingFee" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Sale_externalKey_key" ON "Sale"("externalKey");

-- CreateIndex
CREATE INDEX "Sale_channel_idx" ON "Sale"("channel");
