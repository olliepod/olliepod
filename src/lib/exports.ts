import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/money";
import { SHOW_LABELS, listBucketsWithAvg } from "@/lib/buckets";
import type { SaleChannel } from "@/generated/prisma/client";

export type CsvTable = { headers: string[]; rows: (string | number)[][] };

const CHANNEL_LABELS: Record<SaleChannel, string> = { WHATNOT: "Whatnot", NIFTY_EBAY: "eBay" };

// ---------------------------------------------------------------------------
// Full Data Export -- one CSV per underlying table, covering every model in
// the schema (buckets, hauls/intake, sales, raid trains, death pile).
// ---------------------------------------------------------------------------

async function exportBuckets(): Promise<CsvTable> {
  const buckets = await listBucketsWithAvg();
  return {
    headers: ["Show", "Item Type", "Tag Status", "Count On Hand", "Total COGS", "Avg COGS"],
    rows: buckets.map((b) => [
      b.show ?? "",
      b.itemType ?? "",
      b.tagStatus ?? "",
      b.countOnHand,
      b.totalCogsValue,
      b.avgCogsValue,
    ]),
  };
}

async function exportHauls(): Promise<CsvTable> {
  const hauls = await prisma.haul.findMany({ orderBy: { haulDate: "asc" } });
  return {
    headers: ["ID", "Channel", "Haul Date", "Total Cost", "Notes", "Finalized", "Finalized At"],
    rows: hauls.map((h) => [
      h.id,
      h.channel,
      h.haulDate.toISOString(),
      h.totalCost ? toDecimal(h.totalCost).toFixed(2) : "",
      h.notes ?? "",
      h.finalized ? "yes" : "no",
      h.finalizedAt ? h.finalizedAt.toISOString() : "",
    ]),
  };
}

async function exportHaulSortEntries(): Promise<CsvTable> {
  const entries = await prisma.haulSortEntry.findMany({ orderBy: { createdAt: "asc" } });
  return {
    headers: ["Haul ID", "Destination", "Item Type", "Tag Status", "Brand", "Quantity", "COGS Per Item", "Bucket ID", "Created At"],
    rows: entries.map((e) => [
      e.haulId,
      e.destination,
      e.itemType ?? "",
      e.tagStatus ?? "",
      e.brand ?? "",
      e.quantity,
      e.cogsPerItem ? toDecimal(e.cogsPerItem).toFixed(2) : "",
      e.bucketId ?? "",
      e.createdAt.toISOString(),
    ]),
  };
}

async function exportOrderLines(): Promise<CsvTable> {
  const lines = await prisma.orderLine.findMany({ orderBy: { createdAt: "asc" } });
  return {
    headers: ["Haul ID", "Show", "Item Type", "Tag Status", "Brand", "Quantity", "COGS Per Item", "Description", "Bucket ID", "Created At"],
    rows: lines.map((l) => [
      l.haulId,
      l.show ?? "",
      l.itemType ?? "",
      l.tagStatus ?? "",
      l.brand ?? "",
      l.quantity,
      toDecimal(l.cogsPerItem).toFixed(2),
      l.description ?? "",
      l.bucketId,
      l.createdAt.toISOString(),
    ]),
  };
}

async function exportNeedsWashQueue(): Promise<CsvTable> {
  const items = await prisma.needsWashQueueItem.findMany({ orderBy: { createdAt: "asc" } });
  return {
    headers: ["Haul ID", "Item Type Guess", "Quantity Remaining", "COGS Per Item", "Created At"],
    rows: items.map((i) => [
      i.haulId,
      i.itemTypeGuess ?? "",
      i.quantityRemaining,
      toDecimal(i.cogsPerItem).toFixed(2),
      i.createdAt.toISOString(),
    ]),
  };
}

async function exportStartingCounts(): Promise<CsvTable> {
  const entries = await prisma.startingCountEntry.findMany({ orderBy: { createdAt: "asc" } });
  return {
    headers: ["Bucket ID", "Count", "Total COGS", "Note", "Created At"],
    rows: entries.map((e) => [e.bucketId, e.count, toDecimal(e.totalCogs).toFixed(2), e.note ?? "", e.createdAt.toISOString()]),
  };
}

async function exportBucketTransfers(): Promise<CsvTable> {
  const entries = await prisma.bucketTransferLog.findMany({ orderBy: { createdAt: "asc" } });
  return {
    headers: ["Reason", "From Bucket ID", "To Bucket ID", "Quantity", "COGS Amount", "Note", "Created At"],
    rows: entries.map((e) => [
      e.reason,
      e.fromBucketId,
      e.toBucketId,
      e.quantity,
      toDecimal(e.cogsAmount).toFixed(2),
      e.note ?? "",
      e.createdAt.toISOString(),
    ]),
  };
}

async function exportSales(): Promise<CsvTable> {
  const sales = await prisma.sale.findMany({ orderBy: { transactionCompletedAt: "asc" } });
  return {
    headers: [
      "Channel",
      "Listing Title",
      "Channel Detail",
      "Quantity Sold",
      "Transaction Completed At",
      "Transaction Amount",
      "Kind",
      "Status",
      "Show",
      "Item Type",
      "Tag Status",
      "COGS Amount",
      "Profit Amount",
      "Reconciled At",
    ],
    rows: sales.map((s) => [
      CHANNEL_LABELS[s.channel] ?? s.channel,
      s.listingTitle,
      s.channelDetail ?? "",
      s.quantitySold,
      s.transactionCompletedAt.toISOString(),
      toDecimal(s.transactionAmount).toFixed(2),
      s.kind,
      s.status,
      s.show ?? "",
      s.itemType ?? "",
      s.tagStatus ?? "",
      s.cogsAmount ? toDecimal(s.cogsAmount).toFixed(2) : "",
      s.profitAmount ? toDecimal(s.profitAmount).toFixed(2) : "",
      s.reconciledAt ? s.reconciledAt.toISOString() : "",
    ]),
  };
}

async function exportRaidTrains(): Promise<CsvTable> {
  const trains = await prisma.raidTrain.findMany({ orderBy: { raidDate: "asc" } });
  return {
    headers: ["ID", "Name", "Raid Date", "Notes"],
    rows: trains.map((t) => [t.id, t.name, t.raidDate.toISOString(), t.notes ?? ""]),
  };
}

async function exportRaidTrainPulls(): Promise<CsvTable> {
  const pulls = await prisma.raidTrainPull.findMany({ orderBy: { pulledAt: "asc" } });
  return {
    headers: ["Raid Train ID", "Bucket ID", "Bundle Quantity", "Bundle Price", "Description", "Carried COGS Per Item", "Status", "Pulled At"],
    rows: pulls.map((p) => [
      p.raidTrainId,
      p.bucketId,
      p.bundleQuantity,
      toDecimal(p.bundlePrice).toFixed(2),
      p.description ?? "",
      toDecimal(p.carriedCogsPerItem).toFixed(2),
      p.status,
      p.pulledAt.toISOString(),
    ]),
  };
}

async function exportDeathPileEntries(): Promise<CsvTable> {
  const entries = await prisma.deathPileEntry.findMany({ orderBy: { createdAt: "asc" } });
  return {
    headers: ["Kind", "Quantity", "Note", "Created At"],
    rows: entries.map((e) => [e.kind, e.quantity, e.note ?? "", e.createdAt.toISOString()]),
  };
}

async function exportSaleBundleComponents(): Promise<CsvTable> {
  const components = await prisma.saleBundleComponent.findMany({ orderBy: { createdAt: "asc" } });
  return {
    headers: ["Sale ID", "Bucket ID", "Show", "Item Type", "Tag Status", "Quantity", "COGS Amount", "Revenue Amount", "Profit Amount", "Created At"],
    rows: components.map((c) => [
      c.saleId,
      c.bucketId,
      c.show ?? "",
      c.itemType ?? "",
      c.tagStatus ?? "",
      c.quantity,
      toDecimal(c.cogsAmount).toFixed(2),
      toDecimal(c.revenueAmount).toFixed(2),
      toDecimal(c.profitAmount).toFixed(2),
      c.createdAt.toISOString(),
    ]),
  };
}

export const EXPORT_TABLES = {
  buckets: { label: "Category Buckets", fn: exportBuckets },
  hauls: { label: "Hauls", fn: exportHauls },
  "haul-sort-entries": { label: "Haul Sort Entries", fn: exportHaulSortEntries },
  "order-lines": { label: "Order Lines", fn: exportOrderLines },
  "needs-wash-queue": { label: "Needs Wash Queue", fn: exportNeedsWashQueue },
  "starting-counts": { label: "Starting Counts", fn: exportStartingCounts },
  "bucket-transfers": { label: "Bucket Transfers", fn: exportBucketTransfers },
  sales: { label: "Sales", fn: exportSales },
  "sale-bundle-components": { label: "Sale Bundle Components", fn: exportSaleBundleComponents },
  "raid-trains": { label: "Raid Trains", fn: exportRaidTrains },
  "raid-train-pulls": { label: "Raid Train Pulls", fn: exportRaidTrainPulls },
  "death-pile-entries": { label: "Death Pile Entries", fn: exportDeathPileEntries },
} satisfies Record<string, { label: string; fn: () => Promise<CsvTable> }>;

export type ExportTableKey = keyof typeof EXPORT_TABLES;

// ---------------------------------------------------------------------------
// Tax Summary -- revenue/COGS/profit by calendar quarter, split by channel
// plus a combined total per quarter. Uses transactionCompletedAt (when the
// sale actually happened) rather than reconciledAt (just bookkeeping
// timing), since that's what matters for tax reporting.
// ---------------------------------------------------------------------------

function quarterKey(date: Date): string {
  const q = Math.floor(date.getUTCMonth() / 3) + 1;
  return `${date.getUTCFullYear()}-Q${q}`;
}

type Totals = { revenue: Decimal; cogs: Decimal; profit: Decimal; count: number };

function zeroTotals(): Totals {
  return { revenue: new Decimal(0), cogs: new Decimal(0), profit: new Decimal(0), count: 0 };
}

function addToTotals(t: Totals, revenue: Decimal, cogs: Decimal, profit: Decimal) {
  t.revenue = t.revenue.plus(revenue);
  t.cogs = t.cogs.plus(cogs);
  t.profit = t.profit.plus(profit);
  t.count += 1;
}

export async function exportTaxSummary(): Promise<CsvTable> {
  const sales = await prisma.sale.findMany({
    where: { status: "RECONCILED" },
    select: { channel: true, transactionCompletedAt: true, transactionAmount: true, cogsAmount: true, profitAmount: true },
  });

  const byQuarter = new Map<string, { channels: Map<SaleChannel, Totals>; combined: Totals }>();

  for (const s of sales) {
    const q = quarterKey(s.transactionCompletedAt);
    if (!byQuarter.has(q)) byQuarter.set(q, { channels: new Map(), combined: zeroTotals() });
    const bucket = byQuarter.get(q)!;
    if (!bucket.channels.has(s.channel)) bucket.channels.set(s.channel, zeroTotals());

    const revenue = toDecimal(s.transactionAmount);
    const cogs = toDecimal(s.cogsAmount ?? 0);
    const profit = toDecimal(s.profitAmount ?? 0);

    addToTotals(bucket.channels.get(s.channel)!, revenue, cogs, profit);
    addToTotals(bucket.combined, revenue, cogs, profit);
  }

  const rows: (string | number)[][] = [];
  for (const q of [...byQuarter.keys()].sort()) {
    const bucket = byQuarter.get(q)!;
    for (const [channel, t] of [...bucket.channels.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      rows.push([q, CHANNEL_LABELS[channel] ?? channel, t.count, t.revenue.toFixed(2), t.cogs.toFixed(2), t.profit.toFixed(2)]);
    }
    rows.push([q, "Combined", bucket.combined.count, bucket.combined.revenue.toFixed(2), bucket.combined.cogs.toFixed(2), bucket.combined.profit.toFixed(2)]);
  }

  return { headers: ["Quarter", "Channel", "Sales Count", "Revenue", "COGS", "Profit"], rows };
}

// ---------------------------------------------------------------------------
// Quarterly Inventory Snapshot -- the app only tracks live bucket state (no
// historical point-in-time storage), so this is just the current bucket
// state exported and labeled with the quarter it was taken in.
// ---------------------------------------------------------------------------

export function currentQuarterLabel(date: Date = new Date()): string {
  return quarterKey(date);
}

export async function exportInventorySnapshot(): Promise<CsvTable> {
  return exportBuckets();
}

// ---------------------------------------------------------------------------
// Show / Period Performance -- revenue/COGS/profit grouped by show, for a
// caller-supplied date range (based on transactionCompletedAt).
// ---------------------------------------------------------------------------

const SHOW_GROUP_LABELS: Record<string, string> = {
  ...SHOW_LABELS,
  RAID_TRAIN: "Raid Train",
  UNKNOWN: "Unknown / unmatched",
};

function showGroupKey(sale: { show: string | null; itemType: string | null; raidTrainPullId: string | null }): string {
  if (sale.raidTrainPullId) return "RAID_TRAIN";
  if (
    sale.itemType === "BRA" ||
    sale.itemType === "LINGERIE" ||
    sale.itemType === "JEANS_SHORTS" ||
    sale.itemType === "OTHER"
  ) {
    return "CROSS_SHOW";
  }
  return sale.show ?? "UNKNOWN";
}

export async function exportShowPerformance(start: Date, end: Date): Promise<CsvTable> {
  const sales = await prisma.sale.findMany({
    where: { status: "RECONCILED", transactionCompletedAt: { gte: start, lte: end } },
    select: { show: true, itemType: true, raidTrainPullId: true, transactionAmount: true, cogsAmount: true, profitAmount: true },
  });

  const totals = new Map<string, Totals>();
  for (const s of sales) {
    const key = showGroupKey(s);
    if (!totals.has(key)) totals.set(key, zeroTotals());
    addToTotals(totals.get(key)!, toDecimal(s.transactionAmount), toDecimal(s.cogsAmount ?? 0), toDecimal(s.profitAmount ?? 0));
  }

  const rows = [...totals.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, t]) => [SHOW_GROUP_LABELS[key] ?? key, t.count, t.revenue.toFixed(2), t.cogs.toFixed(2), t.profit.toFixed(2)]);

  return { headers: ["Show", "Sales Count", "Revenue", "COGS", "Profit"], rows };
}
