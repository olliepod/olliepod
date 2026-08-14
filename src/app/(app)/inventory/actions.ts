"use server";

import { revalidatePath } from "next/cache";
import { addStartingCount } from "@/lib/buckets";
import { transferToDealsSteals } from "@/lib/transfers";

export type ActionState = { error?: string; success?: string };

export async function submitStartingCount(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const bucketId = String(formData.get("bucketId") ?? "");
  const count = Number(formData.get("count"));
  const totalCogs = String(formData.get("totalCogs") ?? "");
  const note = String(formData.get("note") ?? "") || undefined;

  if (!bucketId) return { error: "Missing bucket." };
  if (!Number.isInteger(count) || count <= 0) return { error: "Count must be a positive whole number." };
  if (!totalCogs || Number.isNaN(Number(totalCogs)) || Number(totalCogs) < 0) {
    return { error: "Total COGS must be a valid, non-negative amount." };
  }

  try {
    await addStartingCount(bucketId, count, totalCogs, note);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to add starting count." };
  }

  revalidatePath("/inventory");
  revalidatePath("/");
  return { success: `Added ${count} units.` };
}

export async function submitDealsStealsTransfer(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const fromBucketId = String(formData.get("fromBucketId") ?? "");
  const quantity = Number(formData.get("quantity"));
  const note = String(formData.get("note") ?? "") || undefined;

  if (!fromBucketId) return { error: "Missing bucket." };
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { error: "Quantity must be a positive whole number." };
  }

  try {
    await transferToDealsSteals({ fromBucketId, quantity, note });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to move stock to Deals & Steals." };
  }

  revalidatePath("/inventory");
  revalidatePath("/");
  return { success: `Moved ${quantity} units to Deals & Steals.` };
}
