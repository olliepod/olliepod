"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ITEM_TYPES, TAG_STATUSES, SALE_RECONCILE_SHOWS } from "@/lib/constants";
import { submitReconcileSale, submitSkipSale, type ReconcileState } from "./actions";

type SaleRowData = {
  id: string;
  listingTitle: string;
  livestreamTitle: string | null;
  quantitySold: number;
  transactionAmountValue: string;
  transactionCompletedAt: string;
  show: string | null;
  itemType: string | null;
  tagStatus: string | null;
};

export default function SaleRow({ sale }: { sale: SaleRowData }) {
  const router = useRouter();
  const [show, setShow] = useState<(typeof SALE_RECONCILE_SHOWS)[number]["value"]>(
    (sale.show as (typeof SALE_RECONCILE_SHOWS)[number]["value"]) ?? "TORRID_LB"
  );
  const [itemType, setItemType] = useState((sale.itemType as string) ?? "TOP");
  const [tagStatus, setTagStatus] = useState<"PREOWNED" | "NWT">(
    (sale.tagStatus as "PREOWNED" | "NWT") ?? "PREOWNED"
  );
  const [result, setResult] = useState<ReconcileState>({});
  const [pending, startTransition] = useTransition();

  const showIsIrrelevant = itemType === "BRA" || itemType === "LINGERIE";

  function handleReconcile(e: React.FormEvent) {
    e.preventDefault();
    setResult({});
    startTransition(async () => {
      const res = await submitReconcileSale({
        saleId: sale.id,
        show: showIsIrrelevant ? "" : show,
        itemType: itemType as never,
        tagStatus,
      });
      setResult(res);
      if (res.success) router.refresh();
    });
  }

  function handleSkip() {
    setResult({});
    startTransition(async () => {
      const res = await submitSkipSale(sale.id);
      setResult(res);
      if (res.success) router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <p className="text-sm font-medium text-neutral-900">{sale.listingTitle}</p>
      <p className="text-xs text-neutral-500 mt-0.5">
        {sale.livestreamTitle ?? "No show on file"} — qty {sale.quantitySold} — $
        {Number(sale.transactionAmountValue).toFixed(2)} net —{" "}
        {new Date(sale.transactionCompletedAt).toLocaleDateString()}
        {!sale.show && " — no show match, confirm below"}
        {!sale.itemType && " — no type match, confirm below"}
      </p>

      <form
        onSubmit={handleReconcile}
        className="mt-4 grid grid-cols-1 sm:grid-cols-[1.3fr_1.1fr_1.1fr_auto_auto] gap-2 items-end"
      >
        <Field label="Show">
          <select
            className="input"
            value={show}
            onChange={(e) => setShow(e.target.value as typeof show)}
            disabled={showIsIrrelevant}
          >
            {SALE_RECONCILE_SHOWS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type">
          <select className="input" value={itemType} onChange={(e) => setItemType(e.target.value)}>
            {ITEM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tag status">
          <select
            className="input"
            value={tagStatus}
            onChange={(e) => setTagStatus(e.target.value as typeof tagStatus)}
          >
            {TAG_STATUSES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Reconcile"}
        </button>
        <button type="button" disabled={pending} onClick={handleSkip} className="btn-secondary">
          Skip
        </button>
      </form>

      {result.error && <p className="text-xs text-red-600 mt-2">{result.error}</p>}
      {result.success && <p className="text-xs text-green-700 mt-2">{result.success}</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-neutral-600">
      {label}
      {children}
    </label>
  );
}
