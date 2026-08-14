"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitReleasePull, type PullState } from "./actions";

type PullRowData = {
  id: string;
  raidTrainId: string;
  itemTypeLabel: string;
  tagStatusLabel: string;
  bundleQuantity: number;
  bundlePriceValue: string;
  carriedCogsPerItemValue: string;
  description: string | null;
  status: string;
  saleTransactionAmountValue: string | null;
};

export default function PullRow({ pull }: { pull: PullRowData }) {
  const router = useRouter();
  const [result, setResult] = useState<PullState>({});
  const [pending, startTransition] = useTransition();

  function handleRelease() {
    setResult({});
    startTransition(async () => {
      const res = await submitReleasePull(pull.id, pull.raidTrainId);
      setResult(res);
      if (res.success) router.refresh();
    });
  }

  return (
    <tr className="border-t border-neutral-200">
      <td className="py-2 pl-4 pr-4 text-sm text-neutral-900">
        {pull.itemTypeLabel} — {pull.tagStatusLabel}
        {pull.description && <span className="text-neutral-500"> — {pull.description}</span>}
      </td>
      <td className="py-2 pr-4 text-sm text-neutral-600 text-right">{pull.bundleQuantity}</td>
      <td className="py-2 pr-4 text-sm text-neutral-600 text-right">${pull.bundlePriceValue}</td>
      <td className="py-2 pr-4 text-sm text-neutral-600 text-right">${pull.carriedCogsPerItemValue}/ea</td>
      <td className="py-2 pr-4 text-sm text-neutral-600">
        {pull.status === "EARMARKED" && "Earmarked"}
        {pull.status === "SOLD" && `Sold ($${pull.saleTransactionAmountValue ?? "—"})`}
        {pull.status === "RELEASED" && "Released"}
      </td>
      <td className="py-2 pr-4 text-right">
        {pull.status === "EARMARKED" && (
          <button
            type="button"
            disabled={pending}
            onClick={handleRelease}
            className="text-xs text-red-600 hover:underline"
          >
            Release
          </button>
        )}
        {result.error && <p className="text-xs text-red-600 mt-1">{result.error}</p>}
      </td>
    </tr>
  );
}
