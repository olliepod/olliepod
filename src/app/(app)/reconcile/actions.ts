"use server";

import { revalidatePath } from "next/cache";
import { importWeeklyEarningsCsv, reconcileSale, skipSale } from "@/lib/sales";
import type { BucketShow, ItemType, TagStatus } from "@/generated/prisma/client";

export type ImportState = { error?: string; success?: string };

export async function submitImportCsv(input: {
  csvText: string;
  fileName?: string;
}): Promise<ImportState> {
  if (!input.csvText.trim()) return { error: "Paste or choose a CSV file first." };

  try {
    const summary = await importWeeklyEarningsCsv(input.csvText, input.fileName);
    revalidatePath("/reconcile");
    return {
      success: `Imported ${summary.itemSalesImported} sale(s), skipped ${summary.giveawaysSkipped} giveaway(s), ${summary.duplicatesSkipped} already-imported duplicate(s).`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to import CSV." };
  }
}

export type ReconcileState = { error?: string; success?: string };

export async function submitReconcileSale(input: {
  saleId: string;
  show: BucketShow | "";
  itemType: ItemType;
  tagStatus: TagStatus;
}): Promise<ReconcileState> {
  try {
    await reconcileSale({
      saleId: input.saleId,
      show: input.show === "" ? null : input.show,
      itemType: input.itemType,
      tagStatus: input.tagStatus,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to reconcile sale." };
  }

  revalidatePath("/reconcile");
  revalidatePath("/inventory");
  revalidatePath("/");
  return { success: "Reconciled." };
}

export async function submitSkipSale(saleId: string): Promise<ReconcileState> {
  try {
    await skipSale(saleId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to skip sale." };
  }

  revalidatePath("/reconcile");
  return { success: "Skipped." };
}
