import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

type Db = typeof prisma | Prisma.TransactionClient;

// There's exactly one death pile -- a standalone running count of unlisted
// eBay backlog items. The starting count is a flat-estimated one-time entry
// covering the pre-system backlog (no reliable per-item COGS). Every unit
// after that arrives with real COGS already tracked on its own EBAY-show
// CategoryBucket (via haul sorting, itemized orders, or needs-wash
// resolution) -- addEbayIntakeToDeathPile just also bumps this same
// countRemaining so "to list" stays one unified total regardless of which
// batch a unit came from. No dates, no aging, no threshold. This finds the
// single row (creating none) so callers can tell "not set up yet" apart
// from "count is zero".
export async function getDeathPile() {
  return prisma.deathPile.findFirst({
    include: { entries: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
}

async function addToDeathPileWithDb(db: Db, quantity: number, note?: string) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a positive whole number.");
  }

  const existing = await db.deathPile.findFirst();

  if (!existing) {
    return db.deathPile.create({
      data: {
        countRemaining: quantity,
        entries: { create: { kind: "ADDED", quantity, note } },
      },
    });
  }

  await db.deathPileEntry.create({
    data: { deathPileId: existing.id, kind: "ADDED", quantity, note },
  });
  return db.deathPile.update({
    where: { id: existing.id },
    data: { countRemaining: { increment: quantity } },
  });
}

export async function addToDeathPile(quantity: number, note?: string) {
  return prisma.$transaction((tx) => addToDeathPileWithDb(tx, quantity, note));
}

// Called from within a haul/order/needs-wash-resolution transaction whenever
// new stock lands in an EBAY-show bucket, so the pile grows in step with
// real intake instead of needing a separate manual "add" for it.
export async function addEbayIntakeToDeathPile(db: Db, quantity: number) {
  return addToDeathPileWithDb(db, quantity, "Auto: new eBay-bound intake");
}

export async function markListed(quantity: number, note?: string) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a positive whole number.");
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.deathPile.findFirst();
    if (!existing) {
      throw new Error("Set a starting count before marking items as listed.");
    }
    if (quantity > existing.countRemaining) {
      throw new Error(
        `Cannot mark ${quantity} as listed — only ${existing.countRemaining} remaining in the pile.`
      );
    }

    await tx.deathPileEntry.create({
      data: { deathPileId: existing.id, kind: "LISTED", quantity, note },
    });
    return tx.deathPile.update({
      where: { id: existing.id },
      data: { countRemaining: { decrement: quantity } },
    });
  });
}
