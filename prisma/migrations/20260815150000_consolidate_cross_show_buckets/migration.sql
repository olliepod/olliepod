-- Jeans/Shorts and Other now crosslist across every show from one shared
-- pool, same as Bra/Lingerie already did (see normalizeShowForType in
-- src/lib/buckets.ts). No DDL needed -- CategoryBucket.show was always
-- nullable regardless of itemType -- this only consolidates data: any
-- inventory sitting in a per-show Jeans/Shorts or Other bucket moves into
-- the one shared (show IS NULL) bucket for that itemType/tagStatus. The
-- old per-show buckets are zeroed out rather than deleted, since
-- historical rows (sales, haul sort entries, etc.) may still reference
-- them by id.
DO $$
DECLARE
  target_item_type "ItemType";
  target_tag_status "TagStatus";
  target_bucket_id TEXT;
  moved_count INTEGER;
  moved_cogs DECIMAL(10,2);
BEGIN
  FOREACH target_item_type IN ARRAY ARRAY['JEANS_SHORTS', 'OTHER']::"ItemType"[]
  LOOP
    FOREACH target_tag_status IN ARRAY ARRAY['PREOWNED', 'NWT']::"TagStatus"[]
    LOOP
      SELECT COALESCE(SUM("countOnHand"), 0), COALESCE(SUM("totalCogs"), 0)
        INTO moved_count, moved_cogs
        FROM "CategoryBucket"
        WHERE "itemType" = target_item_type
          AND "tagStatus" = target_tag_status
          AND show IS NOT NULL;

      SELECT id INTO target_bucket_id
        FROM "CategoryBucket"
        WHERE "itemType" = target_item_type
          AND "tagStatus" = target_tag_status
          AND show IS NULL
        LIMIT 1;

      IF target_bucket_id IS NULL THEN
        INSERT INTO "CategoryBucket" (id, show, "itemType", "tagStatus", "countOnHand", "totalCogs", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, NULL, target_item_type, target_tag_status, moved_count, moved_cogs, now(), now());
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
        WHERE "itemType" = target_item_type
          AND "tagStatus" = target_tag_status
          AND show IS NOT NULL;
    END LOOP;
  END LOOP;
END $$;
