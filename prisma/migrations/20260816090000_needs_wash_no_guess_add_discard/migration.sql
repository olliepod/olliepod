-- Owner correction: nothing about a needs-wash item should be categorized
-- at haul-sort time -- that's not knowable until it's actually been
-- washed/treated. Drops the now-pointless itemTypeGuess field, and adds a
-- real "didn't come clean" outcome (DISCARDED) alongside the existing
-- resolve-into-a-bucket outcome (now named SAVED) -- previously there was
-- no way to write off a needs-wash unit that didn't survive treatment.

ALTER TABLE "NeedsWashQueueItem" DROP COLUMN "itemTypeGuess";

CREATE TYPE "NeedsWashResolution" AS ENUM ('SAVED', 'DISCARDED');

ALTER TABLE "ResolvedNeedsWashUnit" ALTER COLUMN "bucketId" DROP NOT NULL;
ALTER TABLE "ResolvedNeedsWashUnit" ADD COLUMN "resolution" "NeedsWashResolution" NOT NULL DEFAULT 'SAVED';
