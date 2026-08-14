"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ITEM_TYPES, TAG_STATUSES, ITEMIZED_SHOWS } from "@/lib/constants";
import ReceiptUpload from "../ReceiptUpload";
import { submitItemizedOrder, type SubmitState } from "./actions";

type Line = {
  id: string;
  show: (typeof ITEMIZED_SHOWS)[number]["value"];
  itemType: (typeof ITEM_TYPES)[number]["value"];
  tagStatus: (typeof TAG_STATUSES)[number]["value"];
  bundleQuantity: string;
  bundlePrice: string;
  description: string;
};

function newLine(): Line {
  return {
    id: crypto.randomUUID(),
    show: "TORRID_LB",
    itemType: "TOP",
    tagStatus: "PREOWNED",
    bundleQuantity: "1",
    bundlePrice: "",
    description: "",
  };
}

export default function OrderForm() {
  const router = useRouter();
  const [channel, setChannel] = useState<"VINTED" | "WHATNOT_SOURCE">("VINTED");
  const [haulDate, setHaulDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [receiptKeys, setReceiptKeys] = useState<string[]>([]);
  const [result, setResult] = useState<SubmitState>({});
  const [pending, startTransition] = useTransition();

  function updateLine(id: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeLine(id: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult({});
    startTransition(async () => {
      const res = await submitItemizedOrder({
        channel,
        haulDate,
        notes,
        lines: lines.map((l) => ({
          show: l.show,
          itemType: l.itemType,
          tagStatus: l.tagStatus,
          bundleQuantity: Number(l.bundleQuantity) || 0,
          bundlePrice: l.bundlePrice || "0",
          description: l.description || undefined,
        })),
        receiptKeys,
      });
      setResult(res);
      if (res.success) {
        setLines([newLine()]);
        setNotes("");
        setReceiptKeys([]);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-4xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Channel">
          <select className="input" value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)}>
            <option value="VINTED">Vinted</option>
            <option value="WHATNOT_SOURCE">Whatnot (as a source)</option>
          </select>
        </Field>
        <Field label="Order date">
          <input
            type="date"
            className="input"
            value={haulDate}
            onChange={(e) => setHaulDate(e.target.value)}
            required
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Notes (optional)">
          <input
            type="text"
            className="input"
            placeholder="e.g. Vinted order #45"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        <ReceiptUpload label="Itemized order/receipt detail screenshot(s)" onChange={setReceiptKeys} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-neutral-900">Items / bundles</h2>
          <button type="button" className="btn-secondary text-xs" onClick={() => setLines((l) => [...l, newLine()])}>
            + Add line
          </button>
        </div>
        <p className="text-xs text-neutral-500 mb-3">
          For a bundle, set quantity &gt; 1 and enter the bundle&apos;s total price — it&apos;s split
          evenly across the items in that bundle.
        </p>
        <div className="flex flex-col gap-3">
          {lines.map((line) => (
            <div
              key={line.id}
              className="grid grid-cols-1 sm:grid-cols-[1.3fr_1.1fr_1.1fr_0.7fr_0.9fr_1.4fr_auto] gap-2 items-end rounded-md border border-neutral-200 p-3"
            >
              <Field label="Show / destination">
                <select className="input" value={line.show} onChange={(e) => updateLine(line.id, { show: e.target.value as Line["show"] })}>
                  {ITEMIZED_SHOWS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Type">
                <select className="input" value={line.itemType} onChange={(e) => updateLine(line.id, { itemType: e.target.value as Line["itemType"] })}>
                  {ITEM_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tag status">
                <select className="input" value={line.tagStatus} onChange={(e) => updateLine(line.id, { tagStatus: e.target.value as Line["tagStatus"] })}>
                  {TAG_STATUSES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Bundle qty">
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="input"
                  value={line.bundleQuantity}
                  onChange={(e) => updateLine(line.id, { bundleQuantity: e.target.value })}
                />
              </Field>
              <Field label="Price ($)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="input"
                  value={line.bundlePrice}
                  onChange={(e) => updateLine(line.id, { bundlePrice: e.target.value })}
                />
              </Field>
              <Field label="Description (optional)">
                <input
                  type="text"
                  className="input"
                  value={line.description}
                  onChange={(e) => updateLine(line.id, { description: e.target.value })}
                />
              </Field>
              <button type="button" className="text-xs text-red-600 hover:underline pb-2" onClick={() => removeLine(line.id)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {result.error && <p className="text-sm text-red-600">{result.error}</p>}
      {result.success && <p className="text-sm text-green-700">{result.success}</p>}

      <div>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Logging order…" : "Log order"}
        </button>
      </div>
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
