import { prisma } from "@/lib/prisma";
import { avgCogs, toDecimal } from "@/lib/money";
import type { BucketShow, ItemType, TagStatus, CategoryBucket, Prisma } from "@/generated/prisma/client";

type Db = typeof prisma | Prisma.TransactionClient;

// Bra / Lingerie bypass the show/brand dimension entirely (Section 3): a
// caller may pass a show for these types (e.g. "this bra came from a
// Torrid/LB haul") but it's ignored for bucket-key purposes.
export function normalizeShowForType(show: BucketShow | null, itemType: ItemType): BucketShow | null {
  if (itemType === "BRA" || itemType === "LINGERIE") return null;
  return show;
}

export async function findBucket(
  db: Db,
  show: BucketShow | null,
  itemType: ItemType,
  tagStatus: TagStatus
): Promise<CategoryBucket> {
  const normalizedShow = normalizeShowForType(show, itemType);

  const bucket = normalizedShow
    ? await db.categoryBucket.findUnique({
        where: { show_itemType_tagStatus: { show: normalizedShow, itemType, tagStatus } },
      })
    : await db.categoryBucket.findFirst({
        where: { show: null, itemType, tagStatus },
      });

  if (!bucket) {
    throw new Error(
      `No bucket found for show=${normalizedShow ?? "null"} itemType=${itemType} tagStatus=${tagStatus}. Buckets should be pre-seeded — run the seed script.`
    );
  }
  return bucket;
}

// Plain-serializable shape for passing to Client Components — Prisma's
// Decimal type isn't a plain object, so totalCogs/avgCogs are pre-formatted
// to strings here rather than passed through as-is.
export type BucketWithAvg = Omit<CategoryBucket, "totalCogs"> & {
  totalCogsValue: string;
  avgCogsValue: string;
};

export async function listBucketsWithAvg(): Promise<BucketWithAvg[]> {
  const buckets = await prisma.categoryBucket.findMany({
    orderBy: [{ show: "asc" }, { itemType: "asc" }, { tagStatus: "asc" }],
  });
  return buckets.map(({ totalCogs, ...b }) => ({
    ...b,
    totalCogsValue: toDecimal(totalCogs).toFixed(2),
    avgCogsValue: avgCogs(totalCogs, b.countOnHand).toFixed(2),
  }));
}

const SHOW_ORDER: (BucketShow | "BRA_LINGERIE")[] = [
  "TORRID_LB",
  "DEALS_STEALS",
  "RANDOM_3",
  "RANDOM_5_8",
  "EBAY",
  "BRA_LINGERIE",
];

export const SHOW_LABELS: Record<BucketShow | "BRA_LINGERIE", string> = {
  TORRID_LB: "Torrid/LB Show",
  RANDOM_3: "$3 Random Pull",
  RANDOM_5_8: "$5–8 Random Pull",
  EBAY: "eBay",
  DEALS_STEALS: "Torrid/LB Deals & Steals",
  BRA_LINGERIE: "Bras & Lingerie (all sources)",
};

// One-time starting-inventory reconciliation (Section 4a "Build
// requirement"). Additive by design: each entry is logged as its own row
// so there's a record of when/why counts were added, and it can be used
// more than once if corrections are needed later.
export async function addStartingCount(
  bucketId: string,
  count: number,
  totalCogs: string,
  note?: string
) {
  if (count <= 0) throw new Error("Starting count must be greater than zero.");

  return prisma.$transaction(async (tx) => {
    const entry = await tx.startingCountEntry.create({
      data: { bucketId, count, totalCogs, note },
    });
    await tx.categoryBucket.update({
      where: { id: bucketId },
      data: {
        countOnHand: { increment: count },
        totalCogs: { increment: totalCogs },
      },
    });
    return entry;
  });
}

export async function listBucketsGrouped() {
  const buckets = await listBucketsWithAvg();
  const groups = new Map<BucketShow | "BRA_LINGERIE", BucketWithAvg[]>();

  for (const bucket of buckets) {
    const key: BucketShow | "BRA_LINGERIE" = bucket.show ?? "BRA_LINGERIE";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(bucket);
  }

  return SHOW_ORDER.filter((key) => groups.has(key)).map((key) => ({
    show: key,
    label: SHOW_LABELS[key],
    buckets: groups.get(key)!,
  }));
}
