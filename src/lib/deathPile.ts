import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

type Db = typeof prisma | Prisma.TransactionClient;

// There's exactly one death pile -- a standalone running count of unlisted
// eBay items, fed from two ongoing sources plus one manual action:
//  - addBacklogToDeathPile: repeatable, flat-estimated COGS, for old
//    pre-system stock as it's found (laundry, going through the house,
//    etc.) -- no purchase record, so no real per-item COGS is possible.
//  - addEbayIntakeToDeathPile: automatic, called from haul/order/needs-wash
//    intake whenever new stock lands in an EBAY-show bucket, which already
//    carries real COGS on that bucket.
//  - markListed: the only thing that counts the pile back down, regardless
//    of which of the above a unit came from.
// No dates, no aging, no threshold. getDeathPile finds the single row
// (creating none) so callers can tell "not set up yet" apart from "count is
// zero".
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

// Repeatable manual action for old pre-system stock as it's found -- flat-
// estimated COGS (no purchase record), distinct from both the original
// starting count and real new-intake stock. Always tagged so it reads
// clearly in the activity log; an optional note is appended, not replaced.
export async function addBacklogToDeathPile(quantity: number, note?: string) {
  const label = note ? `Backlog addition — ${note}` : "Backlog addition";
  return prisma.$transaction((tx) => addToDeathPileWithDb(tx, quantity, label));
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
      throw new Error("Add a backlog count or log some eBay-bound intake before marking items as listed.");
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
