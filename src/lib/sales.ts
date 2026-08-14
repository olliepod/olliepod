import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { findBucket } from "@/lib/buckets";
import { avgCogs } from "@/lib/money";
import { parseCsvRecords } from "@/lib/csv";
import type { BucketShow, ItemType, TagStatus } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Weekly Earnings Report CSV import (Whatnot export)
// ---------------------------------------------------------------------------

type ParsedRow = {
  externalKey: string;
  orderId: string;
  listingTitle: string;
  channelDetail: string | null;
  quantitySold: number;
  transactionCompletedAt: Date;
  originalItemPrice: string;
  commissionFee: string;
  paymentProcessingFee: string;
  transactionAmount: string;
  buyerName: string | null;
  buyerState: string | null;
  isGiveaway: boolean;
  show: BucketShow | null;
  itemType: ItemType | null;
  tagStatus: TagStatus | null;
};

// Best-effort itemType guess from a listing title. Free text (e.g. "000.
// TORRID & LB TOPS #81", "P044. LANE BRYANT || 20 / Light Wash Denim
// Shorts Relaxed Fit") -- this is intentionally just a starting point for
// the reconciliation tab, not a source of truth. Shared by both the
// Whatnot and Nifty importers.
export function guessItemType(title: string): ItemType | null {
  const t = title.toUpperCase();
  if (/\bBRA\b|BRALETTE/.test(t)) return "BRA";
  if (/LINGERIE|PANTIES|\bPANTY\b/.test(t)) return "LINGERIE";
  if (/SHORTS?\b|JEANS?\b|DENIM/.test(t)) return "JEANS_SHORTS";
  if (/DRESS/.test(t)) return "DRESS";
  if (/BOTTOMS?\b|SKIRT|PANTS?\b|LEGGINGS?/.test(t)) return "BOTTOM";
  if (/TOPS?\b|T-SHIRT|TSHIRT|\bTEE\b|TANK|CARDIGAN|SWEATER|BLOUSE|SHIRT/.test(t)) return "TOP";
  return null;
}

export function guessTagStatus(title: string): TagStatus {
  return /\bNWT\b/i.test(title) ? "NWT" : "PREOWNED";
}

// Only the standing Torrid/LB show has a reliable livestream-title signal.
// Themed Raid Trains and other one-off show titles aren't modeled as their
// own entity yet (Section 4a "not yet built"), so they're left unmatched
// for a manual pick in the reconciliation tab rather than guessed wrong.
function guessShow(channelDetail: string | null): BucketShow | null {
  if (!channelDetail) return null;
  const t = channelDetail.toUpperCase();
  if (t.includes("TORRID") && (t.includes("LANE BRYANT") || t.includes(" LB "))) {
    return "TORRID_LB";
  }
  return null;
}

function parseDecimalField(value: string): string {
  const trimmed = value.trim();
  return trimmed === "" ? "0" : trimmed;
}

function parseWeeklyEarningsCsv(csvText: string): {
  reportStartDate: Date;
  weekNumber: number;
  rows: ParsedRow[];
} {
  const records = parseCsvRecords(csvText);
  if (records.length === 0) {
    throw new Error("CSV has no data rows.");
  }

  const first = records[0];
  const reportStartDate = new Date(first.REPORT_START_DATE.replace(" ", "T") + "Z");
  const weekNumber = Number(first.WEEK_NUMBER);
  if (Number.isNaN(reportStartDate.getTime())) {
    throw new Error("Could not parse REPORT_START_DATE from the CSV.");
  }

  const rows: ParsedRow[] = records
    .filter((r) => r.TRANSACTION_TYPE === "ORDER_EARNINGS" && r.LEDGER_TRANSACTION_ID)
    .map((r) => {
      const isGiveaway = r.BUY_FORMAT === "GIVEAWAY";
      const listingTitle = r.LISTING_TITLE || r.TRANSACTION_MESSAGE;
      const channelDetail = r.LIVESTREAM_TITLE || null;

      return {
        externalKey: r.LEDGER_TRANSACTION_ID,
        orderId: r.ORDER_ID,
        listingTitle,
        channelDetail,
        quantitySold: Number(r.QUANTITY_SOLD) || 1,
        transactionCompletedAt: new Date(r.TRANSACTION_COMPLETED_AT_UTC.replace(" ", "T") + "Z"),
        originalItemPrice: parseDecimalField(r.ORIGINAL_ITEM_PRICE),
        commissionFee: parseDecimalField(r.COMMISSION_FEE),
        paymentProcessingFee: parseDecimalField(r.PAYMENT_PROCESSING_FEE),
        transactionAmount: parseDecimalField(r.TRANSACTION_AMOUNT),
        buyerName: r.BUYER_NAME || null,
        buyerState: r.BUYER_STATE || null,
        isGiveaway,
        show: isGiveaway ? null : guessShow(channelDetail),
        itemType: isGiveaway ? null : guessItemType(listingTitle),
        tagStatus: isGiveaway ? null : guessTagStatus(listingTitle),
      };
    });

  return { reportStartDate, weekNumber, rows };
}

export type ImportSummary = {
  saleImportId: string;
  itemSalesImported: number;
  giveawaysSkipped: number;
  duplicatesSkipped: number;
};

export async function importWeeklyEarningsCsv(csvText: string, fileName?: string): Promise<ImportSummary> {
  const { reportStartDate, weekNumber, rows } = parseWeeklyEarningsCsv(csvText);

  const existing = await prisma.sale.findMany({
    where: { externalKey: { in: rows.map((r) => r.externalKey) } },
    select: { externalKey: true },
  });
  const existingKeys = new Set(existing.map((e) => e.externalKey));
  const newRows = rows.filter((r) => !existingKeys.has(r.externalKey));

  const saleImport = await prisma.saleImport.create({
    data: { reportStartDate, weekNumber, fileName },
  });

  if (newRows.length > 0) {
    await prisma.sale.createMany({
      data: newRows.map((r) => ({
        saleImportId: saleImport.id,
        channel: "WHATNOT",
        externalKey: r.externalKey,
        orderId: r.orderId,
        listingTitle: r.listingTitle,
        channelDetail: r.channelDetail,
        quantitySold: r.quantitySold,
        transactionCompletedAt: r.transactionCompletedAt,
        originalItemPrice: r.originalItemPrice,
        commissionFee: r.commissionFee,
        paymentProcessingFee: r.paymentProcessingFee,
        transactionAmount: r.transactionAmount,
        buyerName: r.buyerName,
        buyerState: r.buyerState,
        kind: r.isGiveaway ? "GIVEAWAY" : "ITEM_SALE",
        status: r.isGiveaway ? "SKIPPED" : "PENDING",
        show: r.show,
        itemType: r.itemType,
        tagStatus: r.tagStatus,
      })),
    });
  }

  return {
    saleImportId: saleImport.id,
    itemSalesImported: newRows.filter((r) => !r.isGiveaway).length,
    giveawaysSkipped: newRows.filter((r) => r.isGiveaway).length,
    duplicatesSkipped: rows.length - newRows.length,
  };
}

// ---------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------

export async function listPendingSales() {
  return prisma.sale.findMany({
    where: { status: "PENDING" },
    orderBy: { transactionCompletedAt: "asc" },
  });
}

export async function listRecentlyReconciledSales(take = 20) {
  return prisma.sale.findMany({
    where: { status: "RECONCILED" },
    orderBy: { reconciledAt: "desc" },
    take,
  });
}

export type ReconcileInput =
  | { saleId: string; mode: "bucket"; show: BucketShow | null; itemType: ItemType; tagStatus: TagStatus }
  | { saleId: string; mode: "raidTrainPull"; pullId: string };

export async function reconcileSale(input: ReconcileInput) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUniqueOrThrow({ where: { id: input.saleId } });

    if (sale.status !== "PENDING") {
      throw new Error("This sale has already been reconciled or skipped.");
    }

    if (input.mode === "raidTrainPull") {
      const pull = await tx.raidTrainPull.findUniqueOrThrow({
        where: { id: input.pullId },
        include: { bucket: true },
      });
      if (pull.status !== "EARMARKED") {
        throw new Error("This pull is no longer earmarked -- it may have already been sold or released.");
      }
      if (pull.bundleQuantity > pull.bucket.countOnHand) {
        throw new Error(
          `Cannot reconcile ${pull.bundleQuantity} unit(s) — only ${pull.bucket.countOnHand} on hand in that bucket.`
        );
      }

      // Uses the pull's carried COGS (locked in at pull time), not the
      // bucket's current average -- see RaidTrainPull.carriedCogsPerItem.
      const cogsAmount = new Decimal(pull.carriedCogsPerItem.toString()).times(pull.bundleQuantity);
      const profitAmount = new Decimal(sale.transactionAmount.toString()).minus(cogsAmount);

      await tx.categoryBucket.update({
        where: { id: pull.bucketId },
        data: {
          countOnHand: { decrement: pull.bundleQuantity },
          totalCogs: { decrement: cogsAmount.toFixed(2) },
        },
      });
      await tx.raidTrainPull.update({ where: { id: pull.id }, data: { status: "SOLD" } });

      return tx.sale.update({
        where: { id: sale.id },
        data: {
          bucketId: pull.bucketId,
          raidTrainPullId: pull.id,
          cogsAmount: cogsAmount.toFixed(2),
          profitAmount: profitAmount.toFixed(2),
          status: "RECONCILED",
          reconciledAt: new Date(),
        },
      });
    }

    const bucket = await findBucket(tx, input.show, input.itemType, input.tagStatus);
    if (sale.quantitySold > bucket.countOnHand) {
      throw new Error(
        `Cannot reconcile ${sale.quantitySold} unit(s) — only ${bucket.countOnHand} on hand in that bucket.`
      );
    }

    const cogsAmount = avgCogs(bucket.totalCogs, bucket.countOnHand).times(sale.quantitySold);
    const profitAmount = new Decimal(sale.transactionAmount.toString()).minus(cogsAmount);

    await tx.categoryBucket.update({
      where: { id: bucket.id },
      data: {
        countOnHand: { decrement: sale.quantitySold },
        totalCogs: { decrement: cogsAmount.toFixed(2) },
      },
    });

    return tx.sale.update({
      where: { id: sale.id },
      data: {
        show: input.show,
        itemType: input.itemType,
        tagStatus: input.tagStatus,
        bucketId: bucket.id,
        cogsAmount: cogsAmount.toFixed(2),
        profitAmount: profitAmount.toFixed(2),
        status: "RECONCILED",
        reconciledAt: new Date(),
      },
    });
  });
}

export async function skipSale(saleId: string) {
  return prisma.sale.update({
    where: { id: saleId },
    data: { status: "SKIPPED" },
  });
}
