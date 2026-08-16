import { listPendingSales, listRecentlyReconciledSales } from "@/lib/sales";
import { listRaidTrainsWithEarmarkedPulls } from "@/lib/raidTrains";
import { formatMoney } from "@/lib/money";
import { submitImportCsv, submitImportNiftyCsv } from "./actions";
import ImportForm from "./ImportForm";
import SaleRow from "./SaleRow";

const CHANNEL_LABELS: Record<string, string> = {
  WHATNOT: "Whatnot",
  NIFTY_EBAY: "eBay",
};

export default async function ReconcilePage() {
  const [pending, recent, raidTrains] = await Promise.all([
    listPendingSales(),
    listRecentlyReconciledSales(),
    listRaidTrainsWithEarmarkedPulls(),
  ]);

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div>
        <h1 className="page-title text-xl">Sale Reconciliation</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Import a Whatnot Weekly Earnings Report or a Nifty Orders export, then confirm each
          sale&apos;s bucket to decrement inventory and log profit. Giveaway deductions and
          non-eBay/Poshmark/Depop marketplace rows are skipped automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ImportForm label="Whatnot Weekly Earnings Report CSV" action={submitImportCsv} />
        <ImportForm label="Nifty Orders CSV (eBay / Poshmark / Depop)" action={submitImportNiftyCsv} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-900 mb-2">Pending sales ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-neutral-500">Nothing pending.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map((sale) => (
              <SaleRow
                key={sale.id}
                sale={{
                  id: sale.id,
                  channel: sale.channel,
                  listingTitle: sale.listingTitle,
                  channelDetail: sale.channelDetail,
                  quantitySold: sale.quantitySold,
                  transactionAmountValue: sale.transactionAmount.toString(),
                  transactionCompletedAt: sale.transactionCompletedAt.toISOString(),
                  show: sale.show,
                  itemType: sale.itemType,
                  tagStatus: sale.tagStatus,
                }}
                raidTrains={raidTrains}
              />
            ))}
          </div>
        )}
      </div>

      {recent.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 mb-2">Recently reconciled</h2>
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-neutral-500 border-b border-neutral-200">
                  <th className="py-2 pl-4 pr-4 font-medium">Listing</th>
                  <th className="py-2 pr-4 font-medium">Channel</th>
                  <th className="py-2 pr-4 font-medium text-right">Revenue</th>
                  <th className="py-2 pr-4 font-medium text-right">COGS</th>
                  <th className="py-2 pr-4 font-medium text-right">Profit</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((sale) => (
                  <tr key={sale.id} className="border-t border-neutral-200">
                    <td className="py-2 pl-4 pr-4 text-sm text-neutral-900">{sale.listingTitle}</td>
                    <td className="py-2 pr-4 text-sm text-neutral-600">
                      {CHANNEL_LABELS[sale.channel] ?? sale.channel}
                    </td>
                    <td className="py-2 pr-4 text-sm text-neutral-600 text-right">
                      {formatMoney(sale.transactionAmount)}
                    </td>
                    <td className="py-2 pr-4 text-sm text-neutral-600 text-right">
                      {sale.cogsAmount ? formatMoney(sale.cogsAmount) : "—"}
                    </td>
                    <td className="py-2 pr-4 text-sm text-neutral-900 text-right">
                      {sale.profitAmount ? formatMoney(sale.profitAmount) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
