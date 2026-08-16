import { getChannelProfitSummary } from "@/lib/profit";
import { formatMoney } from "@/lib/money";

const CHANNEL_LABELS: Record<string, string> = {
  WHATNOT: "Whatnot",
  NIFTY_EBAY: "eBay",
};

export default async function ProfitPage() {
  const { channels, combined } = await getChannelProfitSummary();

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div>
        <h1 className="page-title text-xl">Profit</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Revenue, COGS, and profit across every reconciled sale, side by side by channel.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-neutral-500 border-b border-neutral-200">
              <th className="py-2 pl-4 pr-4 font-medium">Channel</th>
              <th className="py-2 pr-4 font-medium text-right">Sales</th>
              <th className="py-2 pr-4 font-medium text-right">Revenue</th>
              <th className="py-2 pr-4 font-medium text-right">COGS</th>
              <th className="py-2 pr-4 font-medium text-right">Profit</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((c) => (
              <tr key={c.channel} className="border-t border-neutral-200">
                <td className="py-2 pl-4 pr-4 text-sm text-neutral-900">{CHANNEL_LABELS[c.channel] ?? c.channel}</td>
                <td className="py-2 pr-4 text-sm text-neutral-600 text-right">{c.saleCount}</td>
                <td className="py-2 pr-4 text-sm text-neutral-600 text-right">{formatMoney(c.revenue)}</td>
                <td className="py-2 pr-4 text-sm text-neutral-600 text-right">{formatMoney(c.cogs)}</td>
                <td className="py-2 pr-4 text-sm text-neutral-900 text-right">{formatMoney(c.profit)}</td>
              </tr>
            ))}
            <tr className="border-t border-neutral-200 bg-neutral-50 font-medium">
              <td className="py-2 pl-4 pr-4 text-sm text-neutral-900">Combined</td>
              <td className="py-2 pr-4 text-sm text-neutral-900 text-right">{combined.saleCount}</td>
              <td className="py-2 pr-4 text-sm text-neutral-900 text-right">{formatMoney(combined.revenue)}</td>
              <td className="py-2 pr-4 text-sm text-neutral-900 text-right">{formatMoney(combined.cogs)}</td>
              <td className="py-2 pr-4 text-sm text-neutral-900 text-right">{formatMoney(combined.profit)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
