"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ITEM_TYPES, TAG_STATUSES, SALE_RECONCILE_SHOWS } from "@/lib/constants";
import { submitPullIntoRaidTrain, type PullState } from "./actions";

export default function PullForm({ raidTrainId }: { raidTrainId: string }) {
  const router = useRouter();
  const [show, setShow] = useState<(typeof SALE_RECONCILE_SHOWS)[number]["value"]>("TORRID_LB");
  const [itemType, setItemType] = useState("TOP");
  const [tagStatus, setTagStatus] = useState<"PREOWNED" | "NWT">("PREOWNED");
  const [bundleQuantity, setBundleQuantity] = useState("1");
  const [bundlePrice, setBundlePrice] = useState("");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<PullState>({});
  const [pending, startTransition] = useTransition();

  const showIsIrrelevant = itemType === "BRA" || itemType === "LINGERIE";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult({});
    startTransition(async () => {
      const res = await submitPullIntoRaidTrain({
        raidTrainId,
        show: showIsIrrelevant ? "" : show,
        itemType: itemType as never,
        tagStatus,
        bundleQuantity: Number(bundleQuantity) || 0,
        bundlePrice: bundlePrice || "0",
        description: description || undefined,
      });
      setResult(res);
      if (res.success) {
        setBundleQuantity("1");
        setBundlePrice("");
        setDescription("");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
      <h2 className="text-sm font-semibold text-neutral-900">Pull an item</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Quantity">
          <input
            type="number"
            min={1}
            step={1}
            className="input"
            value={bundleQuantity}
            onChange={(e) => setBundleQuantity(e.target.value)}
          />
        </Field>
        <Field label="Raid price ($)">
          <input
            type="number"
            min={0}
            step="0.01"
            className="input"
            value={bundlePrice}
            onChange={(e) => setBundlePrice(e.target.value)}
            placeholder="e.g. 1.00 for a $1 bundle"
          />
        </Field>
        <Field label="Description (optional)">
          <input
            type="text"
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
      </div>
      <div>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Pulling…" : "Pull into raid train"}
        </button>
      </div>
      {result.error && <p className="text-sm text-red-600">{result.error}</p>}
      {result.success && <p className="text-sm text-green-700">{result.success}</p>}
    </form>
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
