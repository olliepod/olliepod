import { NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { currentQuarterLabel, exportInventorySnapshot } from "@/lib/exports";

export async function GET() {
  const { headers, rows } = await exportInventorySnapshot();
  const quarter = currentQuarterLabel();
  return new NextResponse(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inventory-snapshot-${quarter}.csv"`,
    },
  });
}
