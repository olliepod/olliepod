import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { findBucket } from "@/lib/buckets";
import { addEbayIntakeToDeathPile } from "@/lib/deathPile";
import type {
  BucketShow,
  ItemType,
  TagStatus,
  SortDestination,
} from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Bins / Thrift hauls (Section 2 sorting piles)
// ---------------------------------------------------------------------------

export type SortPileInput = {
  destination: Extract<SortDestination, "EBAY" | "TORRID_LB" | "RANDOM_3" | "RANDOM_5_8" | "SHOP_ITEM" | "NEEDS_WASH">;
  // Null for EBAY/RANDOM_3/RANDOM_5_8 (flat -- no Type/Tag split) and
  // always ignored for NEEDS_WASH -- nothing about a needs-wash item is
  // categorized until it's actually been washed/treated (see
  // resolveNeedsWashUnit). Required for TORRID_LB and SHOP_ITEM, which
  // findBucket needs to resolve the right bucket.
  itemType: ItemType | null;
  tagStatus: TagStatus | null;
  // Brand, e.g. "Torrid"/"Lane Bryant" -- only meaningful for a
  // SHOP_ITEM/JEANS_SHORTS pile, since brand affects resale price.
  brand?: string;
  quantity: number;
};

// Destination -> Show mapping for the piles that go straight to a standing
// bucket. SHOP_ITEM has no show (findBucket routes it via itemType alone,
// same as any other cross-show item). NEEDS_WASH doesn't map to a show yet
// -- its final destination isn't known until it's resolved (see
// resolveNeedsWashUnit).
const SHOW_FOR_DESTINATION: Partial<Record<SortDestination, BucketShow>> = {
  EBAY: "EBAY",
  TORRID_LB: "TORRID_LB",
  RANDOM_3: "RANDOM_3",
  RANDOM_5_8: "RANDOM_5_8",
};

export async function logBinsThriftHaul(input: {
  channel: "GOODWILL_BINS" | "THRIFT";
  haulDate: Date;
  totalCost: string;
  notes?: string;
  sortPiles: SortPileInput[];
  personalQuantity: number;
  trashQuantity: number;
  receiptKeys?: string[];
}) {
  const totalCostDecimal = new Decimal(input.totalCost);
  if (totalCostDecimal.lessThanOrEqualTo(0)) {
    throw new Error("Total haul cost must be greater than zero.");
  }

  // Divisor = eBay + Torrid/LB + $3 Pull + $5-8 Pull + Needs-wash counts.
  // Personal and Trash are excluded (Section 2): trash's share of the haul
  // cost is absorbed as a loss spread across the sellable items rather
  // than assigned to any specific item.
  const sellableCount = input.sortPiles.reduce((sum, p) => sum + p.quantity, 0);
  if (sellableCount <= 0) {
    throw new Error(
      "At least one item must be sorted into eBay, Torrid/LB, $3 Pull, $5-8 Pull, or Needs-wash to compute COGS."
    );
  }

  const cogsPerItem = totalCostDecimal.dividedBy(sellableCount);

  return prisma.$transaction(async (tx) => {
    const haul = await tx.haul.create({
      data: {
        channel: input.channel,
        haulDate: input.haulDate,
        totalCost: input.totalCost,
        notes: input.notes,
        finalized: true,
        finalizedAt: new Date(),
      },
    });

    for (const pile of input.sortPiles) {
      if (pile.quantity <= 0) continue;
      const lineCogs = cogsPerItem.times(pile.quantity);

      if (pile.destination === "NEEDS_WASH") {
        await tx.haulSortEntry.create({
          data: {
            haulId: haul.id,
            destination: "NEEDS_WASH",
            quantity: pile.quantity,
            cogsPerItem: cogsPerItem.toFixed(2),
          },
        });
        await tx.needsWashQueueItem.create({
          data: {
            haulId: haul.id,
            quantityRemaining: pile.quantity,
            cogsPerItem: cogsPerItem.toFixed(2),
          },
        });
        continue;
      }

      // SHOP_ITEM has no show mapping -- undefined here, which findBucket
      // treats the same as an explicit null (routes by itemType alone).
      const show = SHOW_FOR_DESTINATION[pile.destination] ?? null;
      const bucket = await findBucket(tx, show, pile.itemType, pile.tagStatus);

      await tx.categoryBucket.update({
        where: { id: bucket.id },
        data: {
          countOnHand: { increment: pile.quantity },
          totalCogs: { increment: lineCogs.toFixed(2) },
        },
      });

      if (pile.destination === "EBAY") {
        await addEbayIntakeToDeathPile(tx, pile.quantity);
      }

      await tx.haulSortEntry.create({
        data: {
          haulId: haul.id,
          destination: pile.destination,
          itemType: pile.itemType,
          tagStatus: pile.tagStatus,
          brand: pile.brand,
          quantity: pile.quantity,
          cogsPerItem: cogsPerItem.toFixed(2),
          bucketId: bucket.id,
        },
      });
    }

    if (input.personalQuantity > 0) {
      await tx.haulSortEntry.create({
        data: { haulId: haul.id, destination: "PERSONAL", quantity: input.personalQuantity },
      });
    }
    if (input.trashQuantity > 0) {
      await tx.haulSortEntry.create({
        data: { haulId: haul.id, destination: "TRASH", quantity: input.trashQuantity },
      });
    }

    for (const objectKey of input.receiptKeys ?? []) {
      await tx.receipt.create({ data: { haulId: haul.id, objectKey } });
    }

    return haul;
  });
}

// ---------------------------------------------------------------------------
// Vinted / Whatnot-as-source itemized orders (Section 2)
// ---------------------------------------------------------------------------
//
// Priced the same way as a bins/thrift haul: one order-level total paid for
// a known total item count gives a flat per-item COGS (total / count), and
// that same rate applies no matter which bucket a given item is sorted
// into. There's no per-item/per-line price entry and no "bundle" concept --
// that's cost-splitting, not a real bundle, and the flat-rate math already
// handles it.

export type OrderLineInput = {
  // Null for a Shop Item line (Bra/Lingerie/Jeans-Shorts/Other) -- those
  // have no show. Null itemType/tagStatus for a flat-show line
  // (EBAY/RANDOM_3/RANDOM_5_8), which don't split by Type/Tag.
  show: BucketShow | null;
  itemType: ItemType | null;
  tagStatus: TagStatus | null;
  quantity: number;
  description?: string;
  // Brand, e.g. "Torrid"/"Lane Bryant" -- only meaningful for a
  // JEANS_SHORTS line, since brand affects resale price.
  brand?: string;
};

export async function logItemizedOrder(input: {
  channel: "VINTED" | "WHATNOT_SOURCE";
  haulDate: Date;
  notes?: string;
  totalPrice: string;
  totalItemCount: number;
  lines: OrderLineInput[];
  receiptKeys?: string[];
}) {
  const totalPriceDecimal = new Decimal(input.totalPrice);
  if (totalPriceDecimal.lessThanOrEqualTo(0)) {
    throw new Error("Total price paid must be greater than zero.");
  }
  if (input.totalItemCount <= 0) {
    throw new Error("Total item count must be greater than zero.");
  }
  if (input.lines.length === 0) {
    throw new Error("At least one sorted line is required.");
  }

  const sortedCount = input.lines.reduce((sum, l) => sum + l.quantity, 0);
  if (sortedCount !== input.totalItemCount) {
    throw new Error(
      `Sorted item count (${sortedCount}) must match the order's total item count (${input.totalItemCount}).`
    );
  }

  const cogsPerItem = totalPriceDecimal.dividedBy(input.totalItemCount);

  return prisma.$transaction(async (tx) => {
    const haul = await tx.haul.create({
      data: {
        channel: input.channel,
        haulDate: input.haulDate,
        totalCost: input.totalPrice,
        notes: input.notes,
        finalized: true,
        finalizedAt: new Date(),
      },
    });

    for (const line of input.lines) {
      if (line.quantity <= 0) continue;
      const bucket = await findBucket(tx, line.show, line.itemType, line.tagStatus);
      const lineCogs = cogsPerItem.times(line.quantity);

      await tx.categoryBucket.update({
        where: { id: bucket.id },
        data: {
          countOnHand: { increment: line.quantity },
          totalCogs: { increment: lineCogs.toFixed(2) },
        },
      });

      if (line.show === "EBAY") {
        await addEbayIntakeToDeathPile(tx, line.quantity);
      }

      await tx.orderLine.create({
        data: {
          haulId: haul.id,
          show: line.show,
          itemType: line.itemType,
          tagStatus: line.tagStatus,
          brand: line.brand,
          quantity: line.quantity,
          cogsPerItem: cogsPerItem.toFixed(2),
          description: line.description,
          bucketId: bucket.id,
        },
      });
    }

    for (const objectKey of input.receiptKeys ?? []) {
      await tx.receipt.create({ data: { haulId: haul.id, objectKey } });
    }

    return haul;
  });
}

// ---------------------------------------------------------------------------
// Needs-wash queue resolution
// ---------------------------------------------------------------------------

export async function listPendingNeedsWash() {
  return prisma.needsWashQueueItem.findMany({
    where: { quantityRemaining: { gt: 0 } },
    include: { haul: true },
    orderBy: { createdAt: "asc" },
  });
}

export type ResolveNeedsWashInput =
  | {
      queueItemId: string;
      quantity: number;
      outcome: "SAVED";
      // Null for a Shop Item resolution (Bra/Lingerie/Jeans-Shorts/Other).
      show: BucketShow | null;
      itemType: ItemType | null;
      tagStatus: TagStatus | null;
    }
  | {
      queueItemId: string;
      quantity: number;
      // The stain/damage didn't come out -- written off, no bucket.
      outcome: "DISCARDED";
    };

export async function resolveNeedsWashUnit(input: ResolveNeedsWashInput) {
  return prisma.$transaction(async (tx) => {
    const queueItem = await tx.needsWashQueueItem.findUniqueOrThrow({
      where: { id: input.queueItemId },
    });

    if (input.quantity <= 0 || input.quantity > queueItem.quantityRemaining) {
      throw new Error(
        `Cannot resolve ${input.quantity} units — only ${queueItem.quantityRemaining} remaining.`
      );
    }

    await tx.needsWashQueueItem.update({
      where: { id: queueItem.id },
      data: { quantityRemaining: { decrement: input.quantity } },
    });

    if (input.outcome === "DISCARDED") {
      return tx.resolvedNeedsWashUnit.create({
        data: {
          queueItemId: queueItem.id,
          quantity: input.quantity,
          resolution: "DISCARDED",
        },
      });
    }

    const bucket = await findBucket(tx, input.show, input.itemType, input.tagStatus);
    const lineCogs = new Decimal(queueItem.cogsPerItem.toString()).times(input.quantity);

    await tx.categoryBucket.update({
      where: { id: bucket.id },
      data: {
        countOnHand: { increment: input.quantity },
        totalCogs: { increment: lineCogs.toFixed(2) },
      },
    });

    if (input.show === "EBAY") {
      await addEbayIntakeToDeathPile(tx, input.quantity);
    }

    return tx.resolvedNeedsWashUnit.create({
      data: {
        queueItemId: queueItem.id,
        quantity: input.quantity,
        resolution: "SAVED",
        bucketId: bucket.id,
      },
    });
  });
}
