import { getDeathPile } from "@/lib/deathPile";
import DeathPileForms from "./DeathPileForms";

export default async function DeathPilePage() {
  const deathPile = await getDeathPile();

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <div>
        <h1 className="page-title text-xl">eBay Death Pile</h1>
        <p className="text-sm text-neutral-500 mt-1">
          A running count of items waiting to be listed on eBay. Grows from old backlog you add as
          you find it and from new intake sent to an eBay bucket automatically, and counts down as
          you mark items listed — no dates, no aging, no threshold.
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 px-6 py-8 text-center">
        <p className="text-xs text-neutral-500">Items remaining</p>
        <p className="text-5xl font-semibold text-neutral-900 mt-1">
          {deathPile ? deathPile.countRemaining : "—"}
        </p>
        {!deathPile && <p className="text-sm text-neutral-500 mt-2">Add a backlog count to begin.</p>}
      </div>

      <DeathPileForms hasPile={deathPile !== null} />

      {deathPile && deathPile.entries.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 mb-2">Recent activity</h2>
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-neutral-500 border-b border-neutral-200">
                  <th className="py-2 pl-4 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Action</th>
                  <th className="py-2 pr-4 font-medium text-right">Qty</th>
                  <th className="py-2 pr-4 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {deathPile.entries.map((entry) => (
                  <tr key={entry.id} className="border-t border-neutral-200">
                    <td className="py-2 pl-4 pr-4 text-sm text-neutral-600">
                      {entry.createdAt.toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-4 text-sm text-neutral-900">
                      {entry.kind === "ADDED" ? "Added" : "Listed"}
                    </td>
                    <td className="py-2 pr-4 text-sm text-neutral-600 text-right">
                      {entry.kind === "ADDED" ? "+" : "-"}
                      {entry.quantity}
                    </td>
                    <td className="py-2 pr-4 text-sm text-neutral-500">{entry.note ?? "—"}</td>
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
