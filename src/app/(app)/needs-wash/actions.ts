"use server";

import { revalidatePath } from "next/cache";
import { resolveNeedsWashUnit } from "@/lib/hauls";
import type { BucketShow, ItemType, TagStatus } from "@/generated/prisma/client";

export type SubmitState = { error?: string; success?: string };

export async function submitResolveNeedsWash(input: {
  queueItemId: string;
  quantity: number;
  show: BucketShow;
  itemType: ItemType;
  tagStatus: TagStatus;
}): Promise<SubmitState> {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    return { error: "Quantity must be a positive whole number." };
  }

  try {
    await resolveNeedsWashUnit(input);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to resolve item." };
  }

  revalidatePath("/needs-wash");
  revalidatePath("/inventory");
  revalidatePath("/");
  return { success: `Resolved ${input.quantity} unit(s).` };
}
