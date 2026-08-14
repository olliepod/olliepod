import { prisma } from "@/lib/prisma";

// There's exactly one death pile -- a standalone running count of unlisted
// eBay backlog items, unconnected to the CategoryBucket/COGS system. No
// dates, no aging, no threshold; just a total that goes up when more items
// turn up and down as they get listed. This finds the single row (creating
// none) so callers can tell "not set up yet" apart from "count is zero".
export async function getDeathPile() {
  return prisma.deathPile.findFirst({
    include: { entries: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
}

export async function addToDeathPile(quantity: number, note?: string) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a positive whole number.");
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.deathPile.findFirst();

    if (!existing) {
      return tx.deathPile.create({
        data: {
          countRemaining: quantity,
          entries: { create: { kind: "ADDED", quantity, note } },
        },
      });
    }

    await tx.deathPileEntry.create({
      data: { deathPileId: existing.id, kind: "ADDED", quantity, note },
    });
    return tx.deathPile.update({
      where: { id: existing.id },
      data: { countRemaining: { increment: quantity } },
    });
  });
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
