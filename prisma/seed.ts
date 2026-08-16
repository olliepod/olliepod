// Seeds the standing CategoryBucket rows so intake logging always has a
// bucket to increment into. Thin wrapper around the same logic the app
// itself uses to self-heal an unseeded database at runtime (see
// ensureStandingBucketsSeeded in src/lib/buckets.ts) -- kept as a single
// source of truth rather than duplicating the bucket shapes here.
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ensureStandingBucketsSeeded } from "../src/lib/buckets";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  await ensureStandingBucketsSeeded(prisma);
  console.log("Seeded/verified standing category buckets.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
