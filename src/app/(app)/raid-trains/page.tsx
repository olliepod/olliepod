import Link from "next/link";
import { listRaidTrains } from "@/lib/raidTrains";
import CreateRaidTrainForm from "./CreateRaidTrainForm";

export default async function RaidTrainsPage() {
  const raidTrains = await listRaidTrains();

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div>
        <h1 className="page-title text-xl">Raid Trains</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Themed campaigns pulled from the standing buckets. Pulling an item earmarks it — it stays
          fully counted in its home bucket until a real sale reconciles against it.
        </p>
      </div>

      <CreateRaidTrainForm />

      {raidTrains.length === 0 ? (
        <p className="text-sm text-neutral-500">No raid trains yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-neutral-500 border-b border-neutral-200">
                <th className="py-2 pl-4 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium text-right">Earmarked</th>
                <th className="py-2 pr-4 font-medium text-right">Sold</th>
                <th className="py-2 pr-4 font-medium text-right">Revenue</th>
                <th className="py-2 pr-4 font-medium text-right">COGS</th>
                <th className="py-2 pr-4 font-medium text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              {raidTrains.map((rt) => (
                <tr key={rt.id} className="border-t border-neutral-200">
                  <td className="py-2 pl-4 pr-4 text-sm text-neutral-900">
                    <Link href={`/raid-trains/${rt.id}`} className="underline hover:no-underline">
                      {rt.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 text-sm text-neutral-600">
                    {new Date(rt.raidDate).toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-4 text-sm text-neutral-600 text-right">
                    {rt.earmarkedCount} (${rt.earmarkedValue})
                  </td>
                  <td className="py-2 pr-4 text-sm text-neutral-600 text-right">{rt.soldCount}</td>
                  <td className="py-2 pr-4 text-sm text-neutral-600 text-right">${rt.revenueValue}</td>
                  <td className="py-2 pr-4 text-sm text-neutral-600 text-right">${rt.cogsValue}</td>
                  <td className="py-2 pr-4 text-sm text-neutral-900 text-right">${rt.profitValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
