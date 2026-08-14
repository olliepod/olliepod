"use server";

import { revalidatePath } from "next/cache";
import { logItemizedOrder, type OrderLineInput } from "@/lib/hauls";

export type SubmitState = { error?: string; success?: string };

export async function submitItemizedOrder(input: {
  channel: "VINTED" | "WHATNOT_SOURCE";
  haulDate: string;
  notes: string;
  lines: OrderLineInput[];
  receiptKeys: string[];
}): Promise<SubmitState> {
  if (!input.haulDate) return { error: "Order date is required." };

  const cleanedLines = input.lines.filter((l) => l.bundleQuantity > 0 && Number(l.bundlePrice) >= 0);
  if (cleanedLines.length === 0) return { error: "At least one item/bundle line is required." };

  try {
    await logItemizedOrder({
      channel: input.channel,
      haulDate: new Date(input.haulDate),
      notes: input.notes || undefined,
      lines: cleanedLines,
      receiptKeys: input.receiptKeys,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to log order." };
  }

  revalidatePath("/inventory");
  revalidatePath("/");
  return { success: "Order logged and inventory updated." };
}
