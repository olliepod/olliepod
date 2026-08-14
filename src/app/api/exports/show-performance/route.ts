import { NextRequest, NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { exportShowPerformance } from "@/lib/exports";

export async function GET(request: NextRequest) {
  const startParam = request.nextUrl.searchParams.get("start");
  const endParam = request.nextUrl.searchParams.get("end");
  if (!startParam || !endParam) {
    return NextResponse.json({ error: "start and end date query params are required." }, { status: 400 });
  }

  const start = new Date(`${startParam}T00:00:00.000Z`);
  const end = new Date(`${endParam}T23:59:59.999Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: "Invalid start/end date." }, { status: 400 });
  }

  const { headers, rows } = await exportShowPerformance(start, end);
  return new NextResponse(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="show-performance-${startParam}-to-${endParam}.csv"`,
    },
  });
}
