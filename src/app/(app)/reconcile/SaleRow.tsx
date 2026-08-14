"use client";

import { useMemo, useState, useTransition } from "react";
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

type RaidTrainPullOption = {
  id: string;
  bundleQuantity: number;
  bundlePriceValue: string;
  description: string | null;
  itemType: string;
  tagStatus: string;
};

type RaidTrainOption = {
  id: string;
  name: string;
  pulls: RaidTrainPullOption[];
};

const TYPE_LABELS: Record<string, string> = Object.fromEntries(ITEM_TYPES.map((t) => [t.value, t.label]));
const TAG_LABELS: Record<string, string> = Object.fromEntries(TAG_STATUSES.map((t) => [t.value, t.label]));

export default function SaleRow({ sale, raidTrains }: { sale: SaleRowData; raidTrains: RaidTrainOption[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"bucket" | "raidTrainPull">("bucket");
  const [show, setShow] = useState<(typeof SALE_RECONCILE_SHOWS)[number]["value"]>(
    (sale.show as (typeof SALE_RECONCILE_SHOWS)[number]["value"]) ?? "TORRID_LB"
  );
  const [itemType, setItemType] = useState((sale.itemType as string) ?? "TOP");
  const [tagStatus, setTagStatus] = useState<"PREOWNED" | "NWT">(
    (sale.tagStatus as "PREOWNED" | "NWT") ?? "PREOWNED"
  );
  const [raidTrainId, setRaidTrainId] = useState(raidTrains[0]?.id ?? "");
  const [pullId, setPullId] = useState(raidTrains[0]?.pulls[0]?.id ?? "");
  const [result, setResult] = useState<ReconcileState>({});
  const [pending, startTransition] = useTransition();

  const showIsIrrelevant = itemType === "BRA" || itemType === "LINGERIE";
  const selectedRaidTrain = useMemo(() => raidTrains.find((rt) => rt.id === raidTrainId), [raidTrains, raidTrainId]);

  function handleRaidTrainChange(id: string) {
    setRaidTrainId(id);
    const rt = raidTrains.find((r) => r.id === id);
    setPullId(rt?.pulls[0]?.id ?? "");
  }

  function handleReconcile(e: React.FormEvent) {
    e.preventDefault();
    setResult({});
    startTransition(async () => {
      const res =
        mode === "raidTrainPull"
          ? await submitReconcileSale({ saleId: sale.id, mode: "raidTrainPull", pullId })
          : await submitReconcileSale({
              saleId: sale.id,
              mode: "bucket",
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

      {raidTrains.length > 0 && (
        <div className="flex gap-4 mt-3 text-xs text-neutral-600">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              checked={mode === "bucket"}
              onChange={() => setMode("bucket")}
            />
            Standing bucket
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              checked={mode === "raidTrainPull"}
              onChange={() => setMode("raidTrainPull")}
            />
            Raid train pull
          </label>
        </div>
      )}

      <form
        onSubmit={handleReconcile}
        className="mt-4 grid grid-cols-1 sm:grid-cols-[1.3fr_1.1fr_1.1fr_auto_auto] gap-2 items-end"
      >
        {mode === "raidTrainPull" ? (
          <>
            <Field label="Raid train">
              <select className="input" value={raidTrainId} onChange={(e) => handleRaidTrainChange(e.target.value)}>
                {raidTrains.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Pull">
              <select className="input" value={pullId} onChange={(e) => setPullId(e.target.value)}>
                {selectedRaidTrain?.pulls.map((p) => (
                  <option key={p.id} value={p.id}>
                    {TYPE_LABELS[p.itemType] ?? p.itemType} — {TAG_LABELS[p.tagStatus] ?? p.tagStatus}
                    {p.description ? ` — ${p.description}` : ""} (qty {p.bundleQuantity}, $
                    {p.bundlePriceValue})
                  </option>
                ))}
              </select>
            </Field>
            <div />
            <button type="submit" disabled={pending || !pullId} className="btn-primary">
              {pending ? "Saving…" : "Reconcile"}
            </button>
            <button type="button" disabled={pending} onClick={handleSkip} className="btn-secondary">
              Skip
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
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
