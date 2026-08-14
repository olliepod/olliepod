import { NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { exportTaxSummary } from "@/lib/exports";

export async function GET() {
  const { headers, rows } = await exportTaxSummary();
  return new NextResponse(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tax-summary.csv"`,
    },
  });
}
