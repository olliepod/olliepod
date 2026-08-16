import { getRaidTrain } from "@/lib/raidTrains";
import { toDecimal } from "@/lib/money";
import { ITEM_TYPES, TAG_STATUSES } from "@/lib/constants";
import PullForm from "./PullForm";
import PullRow from "./PullRow";

const TYPE_LABELS: Record<string, string> = Object.fromEntries(ITEM_TYPES.map((t) => [t.value, t.label]));
const TAG_LABELS: Record<string, string> = Object.fromEntries(TAG_STATUSES.map((t) => [t.value, t.label]));

export default async function RaidTrainDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raidTrain = await getRaidTrain(id);

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div>
        <h1 className="page-title text-xl">{raidTrain.name}</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {new Date(raidTrain.raidDate).toLocaleDateString()}
          {raidTrain.notes && ` — ${raidTrain.notes}`}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard label="Earmarked" value={`${raidTrain.earmarkedCount} ($${raidTrain.earmarkedValue})`} />
        <StatCard label="Sold" value={raidTrain.soldCount.toString()} />
        <StatCard label="Revenue" value={`$${raidTrain.revenueValue}`} />
        <StatCard label="COGS" value={`$${raidTrain.cogsValue}`} />
        <StatCard label="Profit" value={`$${raidTrain.profitValue}`} />
      </div>

      <PullForm raidTrainId={raidTrain.id} />

      <div>
        <h2 className="text-sm font-semibold text-neutral-900 mb-2">Pulls</h2>
        {raidTrain.pulls.length === 0 ? (
          <p className="text-sm text-neutral-500">Nothing pulled yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-neutral-500 border-b border-neutral-200">
                  <th className="py-2 pl-4 pr-4 font-medium">Item</th>
                  <th className="py-2 pr-4 font-medium text-right">Qty</th>
                  <th className="py-2 pr-4 font-medium text-right">Raid price</th>
                  <th className="py-2 pr-4 font-medium text-right">Carried COGS</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium" />
                </tr>
              </thead>
              <tbody>
                {raidTrain.pulls.map((pull) => (
                  <PullRow
                    key={pull.id}
                    pull={{
                      id: pull.id,
                      raidTrainId: raidTrain.id,
                      itemTypeLabel: TYPE_LABELS[pull.bucket.itemType] ?? pull.bucket.itemType,
                      tagStatusLabel: TAG_LABELS[pull.bucket.tagStatus] ?? pull.bucket.tagStatus,
                      bundleQuantity: pull.bundleQuantity,
                      bundlePriceValue: toDecimal(pull.bundlePrice).toFixed(2),
                      carriedCogsPerItemValue: toDecimal(pull.carriedCogsPerItem).toFixed(2),
                      description: pull.description,
                      status: pull.status,
                      saleTransactionAmountValue: pull.sale ? toDecimal(pull.sale.transactionAmount).toFixed(2) : null,
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 px-4 py-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-lg font-semibold text-neutral-900 mt-1">{value}</p>
    </div>
  );
}
