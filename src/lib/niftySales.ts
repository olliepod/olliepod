import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { parseCsvRecords } from "@/lib/csv";
import { guessItemType, guessTagStatus, type ImportSummary } from "@/lib/sales";

// Nifty's "Orders" export covers every marketplace in one file. eBay,
// Poshmark, and Depop are crosslisted copies of the same inventory against
// the same EBAY-show bucket in this app -- not separate businesses -- so
// all three import as SaleChannel.NIFTY_EBAY. Whatnot rows in this same
// file are excluded entirely; those sales are already handled by the
// separate Whatnot Weekly Earnings import, and including them here would
// double-count them.
const INCLUDED_MARKETPLACES = new Set(["eBay", "Poshmark", "Depop"]);

type ParsedRow = {
  externalKey: string;
  listingTitle: string;
  marketplace: string;
  transactionCompletedAt: Date;
  originalItemPrice: string;
  transactionAmount: string;
};

function parseDecimalField(value: string): string {
  const trimmed = value.trim();
  return trimmed === "" ? "0" : trimmed;
}

// Nifty's own "Cost of Goods" column is folded into its "Total Profit"
// figure, but that's Nifty's own (often-empty) cost record, not what this
// app tracks on the bucket -- so it's backed back out here. What's left
// (sale price + collected shipping, net of refunds/fees/expenses) is the
// revenue reconciliation profit gets computed against, same role
// transactionAmount plays for a Whatnot sale.
function computeTransactionAmount(r: Record<string, string>): string {
  const num = (key: string) => Number(r[key] || 0);
  const revenue =
    num("Sale Price") +
    num("Collected Shipping") -
    num("Amount Refunded to Buyer") -
    num("Standard Fees") -
    num("Shipping Fees") -
    num("Promoted Fees") -
    num("Shipping Expenses") -
    num("Other Expenses");
  return revenue.toFixed(2);
}

// Nifty has no order-ID column, so rows are de-duplicated on a hash of the
// fields that together identify a specific sale.
function computeExternalKey(r: Record<string, string>): string {
  const basis = [r.Marketplace, r["Item Name"], r["Sold At"], r["Sale Price"], r["Standard Fees"]].join("|");
  return `nifty:${createHash("sha256").update(basis).digest("hex").slice(0, 32)}`;
}

function parseNiftyOrdersCsv(csvText: string): ParsedRow[] {
  const records = parseCsvRecords(csvText);
  if (records.length === 0) {
    throw new Error("CSV has no data rows.");
  }

  return records
    .filter((r) => INCLUDED_MARKETPLACES.has(r.Marketplace) && r["Order Status"] === "Completed")
    .map((r) => ({
      externalKey: computeExternalKey(r),
      // Nifty's "Item Name" sometimes has the listing description appended
      // after a blank line (Depop especially) -- only the first line is
      // the actual title.
      listingTitle: r["Item Name"].split("\n")[0].trim(),
      marketplace: r.Marketplace,
      transactionCompletedAt: new Date(r["Sold At"].replace(" ", "T") + "Z"),
      originalItemPrice: parseDecimalField(r["Sale Price"]),
      transactionAmount: computeTransactionAmount(r),
    }));
}

export async function importNiftyOrdersCsv(csvText: string, fileName?: string): Promise<ImportSummary> {
  const rows = parseNiftyOrdersCsv(csvText);

  const existing = await prisma.sale.findMany({
    where: { externalKey: { in: rows.map((r) => r.externalKey) } },
    select: { externalKey: true },
  });
  const existingKeys = new Set(existing.map((e) => e.externalKey));
  const newRows = rows.filter((r) => !existingKeys.has(r.externalKey));

  const saleImport = await prisma.saleImport.create({
    data: { fileName },
  });

  if (newRows.length > 0) {
    await prisma.sale.createMany({
      data: newRows.map((r) => ({
        saleImportId: saleImport.id,
        channel: "NIFTY_EBAY",
        externalKey: r.externalKey,
        listingTitle: r.listingTitle,
        channelDetail: r.marketplace,
        transactionCompletedAt: r.transactionCompletedAt,
        originalItemPrice: r.originalItemPrice,
        transactionAmount: r.transactionAmount,
        kind: "ITEM_SALE",
        status: "PENDING",
        // Always eBay -- crosslisted marketplaces share the one bucket, so
        // there's nothing to guess here, unlike Whatnot's show.
        show: "EBAY",
        itemType: guessItemType(r.listingTitle),
        tagStatus: guessTagStatus(r.listingTitle),
      })),
    });
  }

  return {
    saleImportId: saleImport.id,
    itemSalesImported: newRows.length,
    giveawaysSkipped: 0,
    duplicatesSkipped: rows.length - newRows.length,
  };
}
