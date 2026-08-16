"use server";

import { revalidatePath } from "next/cache";
import { importWeeklyEarningsCsv, reconcileSale, skipSale } from "@/lib/sales";
import { importNiftyOrdersCsv } from "@/lib/niftySales";
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

export async function submitImportNiftyCsv(input: {
  csvText: string;
  fileName?: string;
}): Promise<ImportState> {
  if (!input.csvText.trim()) return { error: "Paste or choose a CSV file first." };

  try {
    const summary = await importNiftyOrdersCsv(input.csvText, input.fileName);
    revalidatePath("/reconcile");
    return {
      success: `Imported ${summary.itemSalesImported} eBay/Poshmark/Depop sale(s), ${summary.duplicatesSkipped} already-imported duplicate(s).`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to import CSV." };
  }
}

export type ReconcileState = { error?: string; success?: string };

export type SubmitReconcileInput =
  | { saleId: string; mode: "bucket"; show: BucketShow | ""; itemType: ItemType; tagStatus: TagStatus }
  | { saleId: string; mode: "raidTrainPull"; pullId: string }
  | {
      saleId: string;
      mode: "bundle";
      components: { show: BucketShow | ""; itemType: ItemType; tagStatus: TagStatus; quantity: number }[];
    };

export async function submitReconcileSale(input: SubmitReconcileInput): Promise<ReconcileState> {
  try {
    if (input.mode === "raidTrainPull") {
      await reconcileSale({ saleId: input.saleId, mode: "raidTrainPull", pullId: input.pullId });
    } else if (input.mode === "bundle") {
      await reconcileSale({
        saleId: input.saleId,
        mode: "bundle",
        components: input.components.map((c) => ({
          show: c.show === "" ? null : c.show,
          itemType: c.itemType,
          tagStatus: c.tagStatus,
          quantity: c.quantity,
        })),
      });
    } else {
      await reconcileSale({
        saleId: input.saleId,
        mode: "bucket",
        show: input.show === "" ? null : input.show,
        itemType: input.itemType,
        tagStatus: input.tagStatus,
      });
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to reconcile sale." };
  }

  revalidatePath("/reconcile");
  revalidatePath("/inventory");
  revalidatePath("/");
  revalidatePath("/raid-trains");
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
