import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { avgCogs } from "@/lib/money";

export default async function DashboardPage() {
  const buckets = await prisma.categoryBucket.findMany();
  const pendingNeedsWash = await prisma.needsWashQueueItem.aggregate({
    _sum: { quantityRemaining: true },
  });

  const totalUnits = buckets.reduce((sum, b) => sum + b.countOnHand, 0);
  const totalCogs = buckets.reduce((sum, b) => sum + Number(b.totalCogs), 0);
  const overallAvg = totalUnits > 0 ? avgCogs(totalCogs.toFixed(2), totalUnits).toFixed(2) : "0.00";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-500 mt-1">Quick snapshot of current inventory.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Units on hand" value={totalUnits.toString()} />
        <StatCard label="Total COGS invested" value={`$${totalCogs.toFixed(2)}`} />
        <StatCard label="Avg COGS / item" value={`$${overallAvg}`} />
      </div>

      {(pendingNeedsWash._sum.quantityRemaining ?? 0) > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {pendingNeedsWash._sum.quantityRemaining} item(s) waiting in the{" "}
          <Link href="/needs-wash" className="underline font-medium">
            Needs Wash queue
          </Link>
          .
        </div>
      )}

      <div className="flex gap-3">
        <Link href="/intake" className="btn-primary">
          Log new intake
        </Link>
        <Link href="/inventory" className="btn-secondary">
          View inventory
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 px-4 py-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-2xl font-semibold text-neutral-900 mt-1">{value}</p>
    </div>
  );
}
