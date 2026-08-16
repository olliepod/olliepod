// Seeds the standing CategoryBucket rows so intake logging always has a
// bucket to increment into. See Section 4a + owner clarifications/corrections:
//  - Torrid/LB and Deals & Steals keep full Type x Tag granularity
//    (Top/Bottom/Dress x Preowned/NWT) -- a show/markdown rack does need to
//    know what's on it. Deals & Steals only ever holds items transferred
//    from a Torrid/LB apparel bucket, so it's seeded with just those types.
//  - eBay, $3 Pull, and $5-8 Pull are flat -- one bucket per show, no
//    Type/Tag split. She decides the price tier at the moment of
//    physically sorting an item, and never tracks what type of item is in
//    a random pull or the eBay TO-LIST bin.
//  - Bra, Lingerie, Jeans/Shorts, and Other (the "Shop Item" destination)
//    crosslist across every show from one shared pool -- tracking them
//    per-show would fragment one physical stack into several partial
//    counts -- so each gets only one bucket per tag status, no show
//    dimension.
import { PrismaClient, BucketShow, ItemType, TagStatus } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SHOW_SPECIFIC_TYPES: ItemType[] = [ItemType.TOP, ItemType.BOTTOM, ItemType.DRESS];
const SHOWS_WITH_APPAREL_TYPES: BucketShow[] = [BucketShow.TORRID_LB, BucketShow.DEALS_STEALS];
const FLAT_SHOWS: BucketShow[] = [BucketShow.RANDOM_3, BucketShow.RANDOM_5_8, BucketShow.EBAY];

const SHOP_ITEM_TYPES: ItemType[] = [ItemType.BRA, ItemType.LINGERIE, ItemType.JEANS_SHORTS, ItemType.OTHER];

const TAG_STATUSES: TagStatus[] = [TagStatus.PREOWNED, TagStatus.NWT];

// Prisma's compound-unique `where` lookup doesn't accept null for a
// nullable key field (nulls aren't guaranteed-unique in Postgres), so
// upsert-by-key isn't usable for any bucket with a null dimension --
// find-then-create instead, used consistently below.
async function findOrCreateBucket(where: { show: BucketShow | null; itemType: ItemType | null; tagStatus: TagStatus | null }) {
  const existing = await prisma.categoryBucket.findFirst({ where });
  if (!existing) {
    await prisma.categoryBucket.create({ data: where });
  }
}

async function main() {
  let created = 0;

  // Torrid/LB + Deals & Steals: full Type x Tag granularity.
  for (const show of SHOWS_WITH_APPAREL_TYPES) {
    for (const itemType of SHOW_SPECIFIC_TYPES) {
      for (const tagStatus of TAG_STATUSES) {
        await findOrCreateBucket({ show, itemType, tagStatus });
        created++;
      }
    }
  }

  // eBay / $3 Pull / $5-8 Pull: flat, one bucket per show.
  for (const show of FLAT_SHOWS) {
    await findOrCreateBucket({ show, itemType: null, tagStatus: null });
    created++;
  }

  // Shop Item (Bra/Lingerie/Jeans-Shorts/Other): no show dimension.
  for (const itemType of SHOP_ITEM_TYPES) {
    for (const tagStatus of TAG_STATUSES) {
      await findOrCreateBucket({ show: null, itemType, tagStatus });
      created++;
    }
  }

  console.log(`Seeded/verified ${created} standing category buckets.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
