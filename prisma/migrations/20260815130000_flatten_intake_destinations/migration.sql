-- AlterEnum
ALTER TYPE "SortDestination" ADD VALUE 'RANDOM_5_8';

-- AlterTable
-- OrderLine.bundleQuantity/bundlePrice retired in favor of quantity/
-- cogsPerItem (order-level flat per-item rate, same shape as
-- HaulSortEntry). Renamed rather than dropped+re-added so any existing
-- rows survive; bundlePrice was a per-line total, so it's converted to a
-- per-item rate for rows where quantity > 0.
ALTER TABLE "OrderLine" RENAME COLUMN "bundleQuantity" TO "quantity";
ALTER TABLE "OrderLine" RENAME COLUMN "bundlePrice" TO "cogsPerItem";
UPDATE "OrderLine" SET "cogsPerItem" = "cogsPerItem" / "quantity" WHERE "quantity" > 0;
