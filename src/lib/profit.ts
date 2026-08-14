import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/money";
import type { SaleChannel } from "@/generated/prisma/client";

export type ChannelProfitSummary = {
  channel: SaleChannel;
  saleCount: number;
  revenue: string;
  cogs: string;
  profit: string;
};

export type ProfitTotals = {
  saleCount: number;
  revenue: string;
  cogs: string;
  profit: string;
};

const CHANNEL_ORDER: SaleChannel[] = ["WHATNOT", "NIFTY_EBAY"];

export async function getChannelProfitSummary(): Promise<{
  channels: ChannelProfitSummary[];
  combined: ProfitTotals;
}> {
  const grouped = await prisma.sale.groupBy({
    by: ["channel"],
    where: { status: "RECONCILED" },
    _count: { _all: true },
    _sum: { transactionAmount: true, cogsAmount: true, profitAmount: true },
  });

  const byChannel = new Map(grouped.map((g) => [g.channel, g]));

  const channels = CHANNEL_ORDER.map((channel) => {
    const g = byChannel.get(channel);
    return {
      channel,
      saleCount: g?._count._all ?? 0,
      revenue: toDecimal(g?._sum.transactionAmount ?? 0).toFixed(2),
      cogs: toDecimal(g?._sum.cogsAmount ?? 0).toFixed(2),
      profit: toDecimal(g?._sum.profitAmount ?? 0).toFixed(2),
    };
  });

  const combined = channels.reduce<ProfitTotals>(
    (acc, c) => ({
      saleCount: acc.saleCount + c.saleCount,
      revenue: toDecimal(acc.revenue).plus(c.revenue).toFixed(2),
      cogs: toDecimal(acc.cogs).plus(c.cogs).toFixed(2),
      profit: toDecimal(acc.profit).plus(c.profit).toFixed(2),
    }),
    { saleCount: 0, revenue: "0.00", cogs: "0.00", profit: "0.00" }
  );

  return { channels, combined };
}
