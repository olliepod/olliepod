import { prisma } from "@/lib/prisma";
import { avgCogs } from "@/lib/money";

// Deals & Steals (Section 3 "Resolved" note + owner clarification): aged,
// slow-moving Torrid/LB apparel that hasn't sold at full price gets
// manually moved out of its standing Torrid/LB type bucket into Deals &
// Steals. This is an immediate, permanent transfer — unlike raid-train
// pulls, which are soft reserves — so the origin bucket's count and COGS
// are decremented right away using its *current* average COGS.
export async function transferToDealsSteals(input: {
  fromBucketId: string;
  quantity: number;
  note?: string;
}) {
  if (input.quantity <= 0) throw new Error("Transfer quantity must be greater than zero.");

  return prisma.$transaction(async (tx) => {
    const fromBucket = await tx.categoryBucket.findUniqueOrThrow({
      where: { id: input.fromBucketId },
    });

    if (fromBucket.show !== "TORRID_LB") {
      throw new Error("Deals & Steals only accepts transfers from standing Torrid/LB buckets.");
    }
    if (input.quantity > fromBucket.countOnHand) {
      throw new Error(
        `Cannot move ${input.quantity} units — only ${fromBucket.countOnHand} on hand in this bucket.`
      );
    }

    const perItem = avgCogs(fromBucket.totalCogs, fromBucket.countOnHand);
    const cogsAmount = perItem.times(input.quantity);

    const toBucket = await tx.categoryBucket.findFirstOrThrow({
      where: { show: "DEALS_STEALS", itemType: fromBucket.itemType, tagStatus: fromBucket.tagStatus },
    });

    await tx.categoryBucket.update({
      where: { id: fromBucket.id },
      data: {
        countOnHand: { decrement: input.quantity },
        totalCogs: { decrement: cogsAmount.toFixed(2) },
      },
    });
    await tx.categoryBucket.update({
      where: { id: toBucket.id },
      data: {
        countOnHand: { increment: input.quantity },
        totalCogs: { increment: cogsAmount.toFixed(2) },
      },
    });

    return tx.bucketTransferLog.create({
      data: {
        reason: "DEALS_STEALS_MARKDOWN",
        fromBucketId: fromBucket.id,
        toBucketId: toBucket.id,
        quantity: input.quantity,
        cogsAmount: cogsAmount.toFixed(2),
        note: input.note,
      },
    });
  });
}
