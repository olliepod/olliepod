import { listBucketsGrouped } from "@/lib/buckets";
import BucketRow from "./BucketRow";

export default async function InventoryPage() {
  const groups = await listBucketsGrouped();

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Inventory</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Category buckets — count on hand, total COGS invested, and running average COGS per item.
        </p>
      </div>

      {groups.map((group) => (
        <section key={group.show}>
          <h2 className="text-sm font-semibold text-neutral-900 mb-2">{group.label}</h2>
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-neutral-500 border-b border-neutral-200">
                  <th className="py-2 pl-4 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Tag</th>
                  <th className="py-2 pr-4 font-medium text-right">On hand</th>
                  <th className="py-2 pr-4 font-medium text-right">Total COGS</th>
                  <th className="py-2 pr-4 font-medium text-right">Avg COGS</th>
                  <th className="py-2 pr-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {group.buckets.map((bucket) => (
                  <BucketRow
                    key={bucket.id}
                    bucket={bucket}
                    canMoveToDealsSteals={group.show === "TORRID_LB"}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
