import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { findBucket } from "@/lib/buckets";
import { avgCogs, toDecimal, type DecimalInput } from "@/lib/money";
import type { BucketShow, ItemType, TagStatus, Prisma } from "@/generated/prisma/client";

type Db = typeof prisma | Prisma.TransactionClient;

// ---------------------------------------------------------------------------
// Raid trains
// ---------------------------------------------------------------------------

export async function createRaidTrain(input: { name: string; raidDate: Date; notes?: string }) {
  return prisma.raidTrain.create({ data: input });
}

type PullForSummary = {
  bundleQuantity: number;
  bundlePrice: DecimalInput;
  carriedCogsPerItem: DecimalInput;
  status: string;
  sale: { transactionAmount: DecimalInput } | null;
};

// Revenue/COGS/profit are intentionally computed here rather than stored on
// RaidTrain, same reasoning as CategoryBucket.totalCogs/countOnHand vs.
// avgCogs -- derive from the pulls (the source of truth) instead of keeping
// a separate running total that could drift.
function summarizeRaidTrain(pulls: PullForSummary[]) {
  let earmarkedCount = 0;
  let earmarkedValue = new Decimal(0);
  let soldCount = 0;
  let revenue = new Decimal(0);
  let cogs = new Decimal(0);

  for (const pull of pulls) {
    if (pull.status === "EARMARKED") {
      earmarkedCount++;
      earmarkedValue = earmarkedValue.plus(toDecimal(pull.bundlePrice));
    } else if (pull.status === "SOLD") {
      soldCount++;
      cogs = cogs.plus(toDecimal(pull.carriedCogsPerItem).times(pull.bundleQuantity));
      if (pull.sale) revenue = revenue.plus(toDecimal(pull.sale.transactionAmount));
    }
  }

  return {
    earmarkedCount,
    earmarkedValue: earmarkedValue.toFixed(2),
    soldCount,
    revenueValue: revenue.toFixed(2),
    cogsValue: cogs.toFixed(2),
    profitValue: revenue.minus(cogs).toFixed(2),
  };
}

export async function listRaidTrains() {
  const raidTrains = await prisma.raidTrain.findMany({
    orderBy: { raidDate: "desc" },
    include: { pulls: { include: { sale: true } } },
  });

  return raidTrains.map(({ pulls, ...raidTrain }) => ({
    ...raidTrain,
    ...summarizeRaidTrain(pulls),
  }));
}

export async function getRaidTrain(id: string) {
  const raidTrain = await prisma.raidTrain.findUniqueOrThrow({
    where: { id },
    include: {
      pulls: { include: { bucket: true, sale: true }, orderBy: { pulledAt: "desc" } },
    },
  });

  const { pulls, ...rest } = raidTrain;
  return { ...rest, ...summarizeRaidTrain(pulls), pulls };
}

// ---------------------------------------------------------------------------
// Pulls (earmarking)
// ---------------------------------------------------------------------------

// How many units of a bucket are still free to earmark: on-hand minus
// whatever's already earmarked (but not yet sold/released) elsewhere.
// Earmarking never touches countOnHand, so this is the only thing stopping
// the same physical stock from being over-committed to multiple pulls.
async function availableToPull(db: Db, bucketId: string): Promise<number> {
  const [bucket, earmarked] = await Promise.all([
    db.categoryBucket.findUniqueOrThrow({ where: { id: bucketId } }),
    db.raidTrainPull.aggregate({
      where: { bucketId, status: "EARMARKED" },
      _sum: { bundleQuantity: true },
    }),
  ]);
  return bucket.countOnHand - (earmarked._sum.bundleQuantity ?? 0);
}

export async function pullIntoRaidTrain(input: {
  raidTrainId: string;
  show: BucketShow | null;
  itemType: ItemType;
  tagStatus: TagStatus;
  bundleQuantity: number;
  bundlePrice: string;
  description?: string;
}) {
  if (input.bundleQuantity <= 0) throw new Error("Quantity must be greater than zero.");

  return prisma.$transaction(async (tx) => {
    const bucket = await findBucket(tx, input.show, input.itemType, input.tagStatus);

    const available = await availableToPull(tx, bucket.id);
    if (input.bundleQuantity > available) {
      throw new Error(
        `Only ${available} unit(s) available to pull -- the rest are on hand but already earmarked elsewhere.`
      );
    }

    return tx.raidTrainPull.create({
      data: {
        raidTrainId: input.raidTrainId,
        bucketId: bucket.id,
        bundleQuantity: input.bundleQuantity,
        bundlePrice: input.bundlePrice,
        description: input.description,
        carriedCogsPerItem: avgCogs(bucket.totalCogs, bucket.countOnHand).toFixed(2),
      },
    });
  });
}

export async function releasePull(pullId: string) {
  return prisma.$transaction(async (tx) => {
    const pull = await tx.raidTrainPull.findUniqueOrThrow({ where: { id: pullId } });
    if (pull.status !== "EARMARKED") {
      throw new Error("Only an earmarked pull can be released.");
    }
    return tx.raidTrainPull.update({ where: { id: pullId }, data: { status: "RELEASED" } });
  });
}

// For the Reconcile tab: raid trains with their still-earmarked pulls, the
// only ones eligible to be matched against an incoming sale.
export async function listRaidTrainsWithEarmarkedPulls() {
  const raidTrains = await prisma.raidTrain.findMany({
    where: { pulls: { some: { status: "EARMARKED" } } },
    orderBy: { raidDate: "desc" },
    include: {
      pulls: { where: { status: "EARMARKED" }, include: { bucket: true }, orderBy: { pulledAt: "asc" } },
    },
  });

  return raidTrains.map((rt) => ({
    id: rt.id,
    name: rt.name,
    pulls: rt.pulls.map((p) => ({
      id: p.id,
      bundleQuantity: p.bundleQuantity,
      bundlePriceValue: toDecimal(p.bundlePrice).toFixed(2),
      description: p.description,
      itemType: p.bucket.itemType,
      tagStatus: p.bucket.tagStatus,
    })),
  }));
}
