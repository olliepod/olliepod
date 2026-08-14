import { NextRequest, NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { EXPORT_TABLES, type ExportTableKey } from "@/lib/exports";

function isExportTableKey(value: string): value is ExportTableKey {
  return value in EXPORT_TABLES;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ table: string }> }) {
  const { table } = await params;
  if (!isExportTableKey(table)) {
    return NextResponse.json({ error: "Unknown export table." }, { status: 404 });
  }

  const { headers, rows } = await EXPORT_TABLES[table].fn();
  return new NextResponse(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${table}.csv"`,
    },
  });
}
