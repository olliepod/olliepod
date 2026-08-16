"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ITEM_TYPES, TAG_STATUSES, SALE_RECONCILE_SHOWS } from "@/lib/constants";
import { submitReconcileSale, submitSkipSale, type ReconcileState } from "./actions";

type SaleRowData = {
  id: string;
  channel: string;
  listingTitle: string;
  channelDetail: string | null;
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

type BundleLine = {
  id: string;
  show: (typeof SALE_RECONCILE_SHOWS)[number]["value"];
  itemType: (typeof ITEM_TYPES)[number]["value"];
  tagStatus: "PREOWNED" | "NWT";
  quantity: string;
};

function newBundleLine(): BundleLine {
  return { id: crypto.randomUUID(), show: "TORRID_LB", itemType: "TOP", tagStatus: "PREOWNED", quantity: "1" };
}

const TYPE_LABELS: Record<string, string> = Object.fromEntries(ITEM_TYPES.map((t) => [t.value, t.label]));
const TAG_LABELS: Record<string, string> = Object.fromEntries(TAG_STATUSES.map((t) => [t.value, t.label]));

export default function SaleRow({ sale, raidTrains }: { sale: SaleRowData; raidTrains: RaidTrainOption[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"bucket" | "raidTrainPull" | "bundle">("bucket");
  const [show, setShow] = useState<(typeof SALE_RECONCILE_SHOWS)[number]["value"]>(
    (sale.show as (typeof SALE_RECONCILE_SHOWS)[number]["value"]) ?? "TORRID_LB"
  );
  const [itemType, setItemType] = useState((sale.itemType as string) ?? "TOP");
  const [tagStatus, setTagStatus] = useState<"PREOWNED" | "NWT">(
    (sale.tagStatus as "PREOWNED" | "NWT") ?? "PREOWNED"
  );
  const [raidTrainId, setRaidTrainId] = useState(raidTrains[0]?.id ?? "");
  const [pullId, setPullId] = useState(raidTrains[0]?.pulls[0]?.id ?? "");
  const [bundleLines, setBundleLines] = useState<BundleLine[]>([newBundleLine(), newBundleLine()]);
  const [result, setResult] = useState<ReconcileState>({});
  const [pending, startTransition] = useTransition();

  const isNiftyEbay = sale.channel === "NIFTY_EBAY";
  const showIsIrrelevant = itemType === "BRA" || itemType === "LINGERIE";
  const selectedRaidTrain = useMemo(() => raidTrains.find((rt) => rt.id === raidTrainId), [raidTrains, raidTrainId]);

  function handleRaidTrainChange(id: string) {
    setRaidTrainId(id);
    const rt = raidTrains.find((r) => r.id === id);
    setPullId(rt?.pulls[0]?.id ?? "");
  }

  function updateBundleLine(id: string, patch: Partial<BundleLine>) {
    setBundleLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeBundleLine(id: string) {
    setBundleLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  }

  function handleReconcile(e: React.FormEvent) {
    e.preventDefault();
    setResult({});
    startTransition(async () => {
      const res =
        mode === "raidTrainPull"
          ? await submitReconcileSale({ saleId: sale.id, mode: "raidTrainPull", pullId })
          : mode === "bundle"
            ? await submitReconcileSale({
                saleId: sale.id,
                mode: "bundle",
                components: bundleLines.map((l) => ({
                  show: l.itemType === "BRA" || l.itemType === "LINGERIE" ? "" : isNiftyEbay ? "EBAY" : l.show,
                  itemType: l.itemType as never,
                  tagStatus: l.tagStatus,
                  quantity: Number(l.quantity) || 0,
                })),
              })
            : await submitReconcileSale({
                saleId: sale.id,
                mode: "bucket",
                show: showIsIrrelevant ? "" : isNiftyEbay ? "EBAY" : show,
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
        {sale.channelDetail ?? "No show on file"} — qty {sale.quantitySold} — $
        {Number(sale.transactionAmountValue).toFixed(2)} net —{" "}
        {new Date(sale.transactionCompletedAt).toLocaleDateString()}
        {!isNiftyEbay && !sale.show && " — no show match, confirm below"}
        {!sale.itemType && " — no type match, confirm below"}
      </p>

      <div className="flex gap-4 mt-3 text-xs text-neutral-600">
        <label className="flex items-center gap-1">
          <input type="radio" checked={mode === "bucket"} onChange={() => setMode("bucket")} />
          Standing bucket
        </label>
        {!isNiftyEbay && raidTrains.length > 0 && (
          <label className="flex items-center gap-1">
            <input
              type="radio"
              checked={mode === "raidTrainPull"}
              onChange={() => setMode("raidTrainPull")}
            />
            Raid train pull
          </label>
        )}
        <label className="flex items-center gap-1">
          <input type="radio" checked={mode === "bundle"} onChange={() => setMode("bundle")} />
          Bundle (multiple categories)
        </label>
      </div>

      {mode === "bundle" ? (
        <form onSubmit={handleReconcile} className="mt-4 flex flex-col gap-3">
          <p className="text-xs text-neutral-500">
            This sale covered more than one category. List what actually went out — each gets
            decremented from its own bucket, and profit is split across them by their own COGS
            share.
          </p>
          <div className="flex flex-col gap-2">
            {bundleLines.map((line) => {
              const lineShowIrrelevant = line.itemType === "BRA" || line.itemType === "LINGERIE";
              return (
                <div
                  key={line.id}
                  className={`grid grid-cols-1 gap-2 items-end rounded-md border border-neutral-200 p-3 ${
                    isNiftyEbay
                      ? "sm:grid-cols-[1.1fr_1.1fr_0.7fr_auto]"
                      : "sm:grid-cols-[1.3fr_1.1fr_1.1fr_0.7fr_auto]"
                  }`}
                >
                  {!isNiftyEbay && (
                    <Field label="Show">
                      <select
                        className="input"
                        value={line.show}
                        onChange={(e) => updateBundleLine(line.id, { show: e.target.value as BundleLine["show"] })}
                        disabled={lineShowIrrelevant}
                      >
                        {SALE_RECONCILE_SHOWS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                  <Field label="Type">
                    <select
                      className="input"
                      value={line.itemType}
                      onChange={(e) => updateBundleLine(line.id, { itemType: e.target.value as BundleLine["itemType"] })}
                    >
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
                      value={line.tagStatus}
                      onChange={(e) => updateBundleLine(line.id, { tagStatus: e.target.value as BundleLine["tagStatus"] })}
                    >
                      {TAG_STATUSES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Qty">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      className="input"
                      value={line.quantity}
                      onChange={(e) => updateBundleLine(line.id, { quantity: e.target.value })}
                    />
                  </Field>
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline pb-2"
                    onClick={() => removeBundleLine(line.id)}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
          <div>
            <button type="button" className="btn-secondary text-xs" onClick={() => setBundleLines((l) => [...l, newBundleLine()])}>
              + Add component
            </button>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn-primary">
              {pending ? "Saving…" : "Reconcile"}
            </button>
            <button type="button" disabled={pending} onClick={handleSkip} className="btn-secondary">
              Skip
            </button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={handleReconcile}
          className={`mt-4 grid grid-cols-1 gap-2 items-end ${
            mode === "bucket" && isNiftyEbay
              ? "sm:grid-cols-[1.1fr_1.1fr_auto_auto]"
              : "sm:grid-cols-[1.3fr_1.1fr_1.1fr_auto_auto]"
          }`}
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
              {!isNiftyEbay && (
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
              )}
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
      )}

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
