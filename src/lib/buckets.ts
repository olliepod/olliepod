import { prisma } from "@/lib/prisma";
import { avgCogs, toDecimal } from "@/lib/money";
import type { BucketShow, ItemType, TagStatus, CategoryBucket, Prisma } from "@/generated/prisma/client";

type Db = typeof prisma | Prisma.TransactionClient;

// Bra, Lingerie, Jeans/Shorts, and Other bypass the show/brand dimension
// entirely -- these crosslist across shows (a pair of jeans might sell
// through the Torrid/LB show, a $5-8 pull, or eBay on any given day, from
// the same physical stack), so tracking them per-show would fragment one
// pool of inventory into several partial counts. A caller may still pass a
// show for these types (e.g. which pile it physically got sorted into, for
// eBay Death Pile purposes) but it's ignored for bucket-key purposes.
export const CROSS_SHOW_ITEM_TYPES: ItemType[] = ["BRA", "LINGERIE", "JEANS_SHORTS", "OTHER"];

// eBay, $3 Pull, and $5-8 Pull bypass the type/tag dimension entirely --
// owner correction: she decides the price tier at the moment of physically
// sorting an item onto a rack, and never tracks what type of item is in a
// random pull or the eBay TO-LIST bin. Torrid/LB and Deals & Steals keep
// full Type x Tag granularity (a themed show/markdown rack does need to
// know what's on it).
export const FLAT_SHOWS: BucketShow[] = ["EBAY", "RANDOM_3", "RANDOM_5_8"];

export function normalizeShowForType(show: BucketShow | null, itemType: ItemType | null): BucketShow | null {
  if (itemType && CROSS_SHOW_ITEM_TYPES.includes(itemType)) return null;
  return show;
}

export async function findBucket(
  db: Db,
  show: BucketShow | null,
  itemType: ItemType | null,
  tagStatus: TagStatus | null
): Promise<CategoryBucket> {
  const normalizedShow = normalizeShowForType(show, itemType);
  const isFlat = normalizedShow !== null && FLAT_SHOWS.includes(normalizedShow);
  const normalizedItemType = isFlat ? null : itemType;
  const normalizedTagStatus = isFlat ? null : tagStatus;

  const bucket = await db.categoryBucket.findFirst({
    where: { show: normalizedShow, itemType: normalizedItemType, tagStatus: normalizedTagStatus },
  });

  if (!bucket) {
    throw new Error(
      `No bucket found for show=${normalizedShow ?? "null"} itemType=${normalizedItemType ?? "null"} tagStatus=${normalizedTagStatus ?? "null"}. Buckets should be pre-seeded — run the seed script.`
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
    // Excludes defunct buckets left behind by the two consolidations:
    //  - a per-show Jeans/Shorts or Other bucket from before those became
    //    cross-show
    //  - a per-Type/Tag eBay/$3 Pull/$5-8 Pull bucket from before those
    //    became flat
    // normalizeShowForType/findBucket never route new inventory there
    // again, so they're permanently zero and just clutter the list.
    //
    // Written as null-safe ORs rather than `NOT: { in: [...] }` -- on a
    // nullable column, `itemType IN (...)` evaluates to SQL NULL (not
    // false) when itemType is null, which poisons an enclosing AND/NOT and
    // silently drops the row from the result instead of keeping it.
    where: {
      AND: [
        { OR: [{ itemType: null }, { itemType: { notIn: CROSS_SHOW_ITEM_TYPES } }, { show: null }] },
        { OR: [{ show: null }, { show: { notIn: FLAT_SHOWS } }, { itemType: null }] },
      ],
    },
    orderBy: [{ show: "asc" }, { itemType: "asc" }, { tagStatus: "asc" }],
  });
  return buckets.map(({ totalCogs, ...b }) => ({
    ...b,
    totalCogsValue: toDecimal(totalCogs).toFixed(2),
    avgCogsValue: avgCogs(totalCogs, b.countOnHand).toFixed(2),
  }));
}

const SHOW_ORDER: (BucketShow | "CROSS_SHOW")[] = [
  "TORRID_LB",
  "DEALS_STEALS",
  "RANDOM_3",
  "RANDOM_5_8",
  "EBAY",
  "CROSS_SHOW",
];

export const SHOW_LABELS: Record<BucketShow | "CROSS_SHOW", string> = {
  TORRID_LB: "Torrid/LB Show",
  RANDOM_3: "$3 Random Pull",
  RANDOM_5_8: "$5–8 Random Pull",
  EBAY: "eBay",
  DEALS_STEALS: "Torrid/LB Deals & Steals",
  CROSS_SHOW: "Shop Items (Bras, Lingerie, Jeans/Shorts, Other — all sources)",
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
  const groups = new Map<BucketShow | "CROSS_SHOW", BucketWithAvg[]>();

  for (const bucket of buckets) {
    const key: BucketShow | "CROSS_SHOW" = bucket.show ?? "CROSS_SHOW";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(bucket);
  }

  return SHOW_ORDER.filter((key) => groups.has(key)).map((key) => ({
    show: key,
    label: SHOW_LABELS[key],
    buckets: groups.get(key)!,
  }));
}
