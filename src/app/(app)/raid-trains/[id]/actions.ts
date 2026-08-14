"use server";

import { revalidatePath } from "next/cache";
import { pullIntoRaidTrain, releasePull } from "@/lib/raidTrains";
import type { BucketShow, ItemType, TagStatus } from "@/generated/prisma/client";

export type PullState = { error?: string; success?: string };

export async function submitPullIntoRaidTrain(input: {
  raidTrainId: string;
  show: BucketShow | "";
  itemType: ItemType;
  tagStatus: TagStatus;
  bundleQuantity: number;
  bundlePrice: string;
  description?: string;
}): Promise<PullState> {
  if (!Number.isInteger(input.bundleQuantity) || input.bundleQuantity <= 0) {
    return { error: "Quantity must be a positive whole number." };
  }
  if (!input.bundlePrice || Number.isNaN(Number(input.bundlePrice)) || Number(input.bundlePrice) < 0) {
    return { error: "Price must be a valid, non-negative amount." };
  }

  try {
    await pullIntoRaidTrain({
      raidTrainId: input.raidTrainId,
      show: input.show === "" ? null : input.show,
      itemType: input.itemType,
      tagStatus: input.tagStatus,
      bundleQuantity: input.bundleQuantity,
      bundlePrice: input.bundlePrice,
      description: input.description,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to pull item." };
  }

  revalidatePath(`/raid-trains/${input.raidTrainId}`);
  revalidatePath("/raid-trains");
  revalidatePath("/reconcile");
  return { success: "Pulled." };
}

export async function submitReleasePull(pullId: string, raidTrainId: string): Promise<PullState> {
  try {
    await releasePull(pullId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to release pull." };
  }

  revalidatePath(`/raid-trains/${raidTrainId}`);
  revalidatePath("/raid-trains");
  revalidatePath("/reconcile");
  return { success: "Released." };
}
