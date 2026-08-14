// Seeds the standing CategoryBucket rows so intake logging always has a
// bucket to increment into. See Section 4a + owner clarifications:
//  - Bra / Lingerie buckets skip the `show` dimension entirely (brand and
//    channel don't affect their price), so only one bucket per tag status.
//  - Deals & Steals only ever holds items that came from a Torrid/LB
//    apparel bucket (aged-stock markdowns), so it's seeded with the same
//    apparel types as Torrid/LB, not Bra/Lingerie.
//  - Random $3 is bins/thrift sourced, Random $5-8 is Vinted sourced, but
//    both are still valid bucket destinations regardless of a particular
//    haul's channel, so both get the full apparel type set.
import { PrismaClient, BucketShow, ItemType, TagStatus } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const APPAREL_TYPES: ItemType[] = [
  ItemType.TOP,
  ItemType.BOTTOM,
  ItemType.DRESS,
  ItemType.JEANS_SHORTS,
  ItemType.OTHER,
];

const TAG_STATUSES: TagStatus[] = [TagStatus.PREOWNED, TagStatus.NWT];

const SHOWS_WITH_APPAREL_TYPES: BucketShow[] = [
  BucketShow.TORRID_LB,
  BucketShow.RANDOM_3,
  BucketShow.RANDOM_5_8,
  BucketShow.EBAY,
  BucketShow.DEALS_STEALS,
];

async function main() {
  let created = 0;

  for (const show of SHOWS_WITH_APPAREL_TYPES) {
    for (const itemType of APPAREL_TYPES) {
      for (const tagStatus of TAG_STATUSES) {
        await prisma.categoryBucket.upsert({
          where: { show_itemType_tagStatus: { show, itemType, tagStatus } },
          update: {},
          create: { show, itemType, tagStatus },
        });
        created++;
      }
    }
  }

  // Bra / Lingerie: no show dimension. Prisma's compound-unique `where`
  // lookup doesn't accept null for a nullable key field (nulls aren't
  // guaranteed-unique in Postgres), so upsert-by-key isn't usable here --
  // find-then-create instead.
  for (const itemType of [ItemType.BRA, ItemType.LINGERIE]) {
    for (const tagStatus of TAG_STATUSES) {
      const existing = await prisma.categoryBucket.findFirst({
        where: { show: null, itemType, tagStatus },
      });
      if (!existing) {
        await prisma.categoryBucket.create({ data: { show: null, itemType, tagStatus } });
      }
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
