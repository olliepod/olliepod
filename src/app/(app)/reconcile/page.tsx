import { listPendingSales, listRecentlyReconciledSales } from "@/lib/sales";
import { formatMoney } from "@/lib/money";
import ImportForm from "./ImportForm";
import SaleRow from "./SaleRow";

export default async function ReconcilePage() {
  const pending = await listPendingSales();
  const recent = await listRecentlyReconciledSales();

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Sale Reconciliation</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Import a Whatnot Weekly Earnings Report, then confirm each sale&apos;s bucket to
          decrement inventory and log profit. Giveaway deductions are skipped automatically.
        </p>
      </div>

      <ImportForm />

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
                  listingTitle: sale.listingTitle,
                  livestreamTitle: sale.livestreamTitle,
                  quantitySold: sale.quantitySold,
                  transactionAmountValue: sale.transactionAmount.toString(),
                  transactionCompletedAt: sale.transactionCompletedAt.toISOString(),
                  show: sale.show,
                  itemType: sale.itemType,
                  tagStatus: sale.tagStatus,
                }}
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
                  <th className="py-2 pr-4 font-medium text-right">Revenue</th>
                  <th className="py-2 pr-4 font-medium text-right">COGS</th>
                  <th className="py-2 pr-4 font-medium text-right">Profit</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((sale) => (
                  <tr key={sale.id} className="border-t border-neutral-200">
                    <td className="py-2 pl-4 pr-4 text-sm text-neutral-900">{sale.listingTitle}</td>
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
