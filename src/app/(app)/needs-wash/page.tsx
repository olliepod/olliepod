import { listPendingNeedsWash } from "@/lib/hauls";
import { toDecimal } from "@/lib/money";
import QueueRow from "./QueueRow";

export default async function NeedsWashPage() {
  const items = await listPendingNeedsWash();

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="page-title text-xl">Needs Wash Queue</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Items held for wash/stain treatment. Each carries the per-item COGS locked in at haul
          time — resolve into a final bucket once treated.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing pending.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <QueueRow
              key={item.id}
              item={{
                id: item.id,
                itemTypeGuess: item.itemTypeGuess,
                quantityRemaining: item.quantityRemaining,
                cogsPerItemValue: toDecimal(item.cogsPerItem).toFixed(2),
                haul: { channel: item.haul.channel, haulDate: item.haul.haulDate.toISOString() },
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
