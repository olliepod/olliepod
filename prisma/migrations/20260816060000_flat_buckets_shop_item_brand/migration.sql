-- Owner corrections from real usage (Section 4a):
--  1/2. eBay, $3 Pull, and $5-8 Pull become flat buckets -- count + total
--       COGS only, no Type x Tag split. She decides the price tier at the
--       moment of physically sorting, and never tracks what type of item
--       went into a random pull or the eBay TO-LIST bin.
--  3. Shop Item (Bra/Lingerie/Jeans-Shorts/Other) becomes its own top-level
--     intake destination for Bins/Thrift sorting (SortDestination), rather
--     than only reachable by picking a show and then a crosslisting item
--     type. Jeans/Shorts also gets an optional Brand field, since brand
--     affects resale price.
-- Torrid/LB and Deals & Steals are unaffected -- they keep full Type x Tag
-- granularity, since a show/markdown rack does need to know what's on it.

-- ---------------------------------------------------------------------------
-- DDL
-- ---------------------------------------------------------------------------

ALTER TABLE "CategoryBucket" ALTER COLUMN "itemType" DROP NOT NULL;
ALTER TABLE "CategoryBucket" ALTER COLUMN "tagStatus" DROP NOT NULL;

ALTER TABLE "OrderLine" ALTER COLUMN "show" DROP NOT NULL;
ALTER TABLE "OrderLine" ALTER COLUMN "itemType" DROP NOT NULL;
ALTER TABLE "OrderLine" ALTER COLUMN "tagStatus" DROP NOT NULL;
ALTER TABLE "OrderLine" ADD COLUMN "brand" TEXT;

ALTER TABLE "HaulSortEntry" ADD COLUMN "brand" TEXT;

ALTER TABLE "SaleBundleComponent" ALTER COLUMN "itemType" DROP NOT NULL;
ALTER TABLE "SaleBundleComponent" ALTER COLUMN "tagStatus" DROP NOT NULL;

ALTER TYPE "SortDestination" ADD VALUE 'SHOP_ITEM';

-- ---------------------------------------------------------------------------
-- DML -- consolidate each flat show's existing per-Type/Tag buckets into one
-- flat (itemType IS NULL, tagStatus IS NULL) bucket, same zero-don't-delete
-- pattern as the earlier cross-show consolidation (see
-- 20260815150000_consolidate_cross_show_buckets): old rows are zeroed, not
-- deleted, since historical rows (HaulSortEntry, OrderLine, Sale,
-- RaidTrainPull, SaleBundleComponent) may still reference them by id.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  target_show "BucketShow";
  target_bucket_id TEXT;
  moved_count INTEGER;
  moved_cogs DECIMAL(10,2);
BEGIN
  FOREACH target_show IN ARRAY ARRAY['EBAY', 'RANDOM_3', 'RANDOM_5_8']::"BucketShow"[]
  LOOP
    SELECT COALESCE(SUM("countOnHand"), 0), COALESCE(SUM("totalCogs"), 0)
      INTO moved_count, moved_cogs
      FROM "CategoryBucket"
      WHERE show = target_show AND "itemType" IS NOT NULL;

    SELECT id INTO target_bucket_id
      FROM "CategoryBucket"
      WHERE show = target_show AND "itemType" IS NULL AND "tagStatus" IS NULL
      LIMIT 1;

    IF target_bucket_id IS NULL THEN
      INSERT INTO "CategoryBucket" (id, show, "itemType", "tagStatus", "countOnHand", "totalCogs", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, target_show, NULL, NULL, moved_count, moved_cogs, now(), now());
    ELSE
      UPDATE "CategoryBucket"
        SET "countOnHand" = "countOnHand" + moved_count,
            "totalCogs" = "totalCogs" + moved_cogs,
            "updatedAt" = now()
        WHERE id = target_bucket_id;
    END IF;

    UPDATE "CategoryBucket"
      SET "countOnHand" = 0,
          "totalCogs" = 0,
          "updatedAt" = now()
      WHERE show = target_show AND "itemType" IS NOT NULL;
  END LOOP;
END $$;
