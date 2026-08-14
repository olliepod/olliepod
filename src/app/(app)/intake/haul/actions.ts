"use server";

import { revalidatePath } from "next/cache";
import { logBinsThriftHaul, type SortPileInput } from "@/lib/hauls";

export type SubmitState = { error?: string; success?: string };

export async function submitBinsThriftHaul(input: {
  channel: "GOODWILL_BINS" | "THRIFT";
  haulDate: string;
  totalCost: string;
  notes: string;
  sortPiles: SortPileInput[];
  personalQuantity: number;
  trashQuantity: number;
  receiptKeys: string[];
}): Promise<SubmitState> {
  if (!input.haulDate) return { error: "Haul date is required." };
  if (!input.totalCost || Number.isNaN(Number(input.totalCost)) || Number(input.totalCost) <= 0) {
    return { error: "Total haul cost must be a valid amount greater than zero." };
  }

  const cleanedPiles = input.sortPiles.filter((p) => p.quantity > 0);

  try {
    await logBinsThriftHaul({
      channel: input.channel,
      haulDate: new Date(input.haulDate),
      totalCost: input.totalCost,
      notes: input.notes || undefined,
      sortPiles: cleanedPiles,
      personalQuantity: input.personalQuantity || 0,
      trashQuantity: input.trashQuantity || 0,
      receiptKeys: input.receiptKeys,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to log haul." };
  }

  revalidatePath("/inventory");
  revalidatePath("/needs-wash");
  revalidatePath("/");
  return { success: "Haul logged and inventory updated." };
}
