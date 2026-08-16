"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ITEM_TYPES, TAG_STATUSES, STANDING_SHOW_DESTINATIONS } from "@/lib/constants";
import ReceiptUpload from "../ReceiptUpload";
import { submitItemizedOrder, type SubmitState } from "./actions";

type Line = {
  id: string;
  show: (typeof STANDING_SHOW_DESTINATIONS)[number]["value"];
  itemType: (typeof ITEM_TYPES)[number]["value"];
  tagStatus: (typeof TAG_STATUSES)[number]["value"];
  quantity: string;
  description: string;
};

function newLine(): Line {
  return {
    id: crypto.randomUUID(),
    show: "TORRID_LB",
    itemType: "TOP",
    tagStatus: "PREOWNED",
    quantity: "1",
    description: "",
  };
}

export default function OrderForm() {
  const router = useRouter();
  const [channel, setChannel] = useState<"VINTED" | "WHATNOT_SOURCE">("VINTED");
  const [haulDate, setHaulDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [totalPrice, setTotalPrice] = useState("");
  const [totalItemCount, setTotalItemCount] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [receiptKeys, setReceiptKeys] = useState<string[]>([]);
  const [result, setResult] = useState<SubmitState>({});
  const [pending, startTransition] = useTransition();

  const sortedCount = useMemo(() => lines.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0), [lines]);
  const targetCount = Number(totalItemCount) || 0;
  const countsMatch = targetCount > 0 && sortedCount === targetCount;
  const perItemCost = useMemo(() => {
    const price = Number(totalPrice);
    if (!price || targetCount <= 0) return null;
    return (price / targetCount).toFixed(2);
  }, [totalPrice, targetCount]);

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
        totalPrice,
        totalItemCount: targetCount,
        lines: lines.map((l) => ({
          show: l.show,
          itemType: l.itemType,
          tagStatus: l.tagStatus,
          quantity: Number(l.quantity) || 0,
          description: l.description || undefined,
        })),
        receiptKeys,
      });
      setResult(res);
      if (res.success) {
        setLines([newLine()]);
        setTotalPrice("");
        setTotalItemCount("");
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
        <h2 className="text-sm font-semibold text-neutral-900 mb-1">Step 1 — Order total</h2>
        <p className="text-xs text-neutral-500 mb-3">
          Enter what you paid and how many items that covered — the per-item cost is a flat split
          across all of them, same as a bins/thrift haul.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Total price paid ($)">
            <input
              type="number"
              min={0}
              step="0.01"
              className="input"
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value)}
              required
            />
          </Field>
          <Field label="Total item count">
            <input
              type="number"
              min={1}
              step={1}
              className="input"
              value={totalItemCount}
              onChange={(e) => setTotalItemCount(e.target.value)}
              required
            />
          </Field>
          <div className="flex flex-col justify-end">
            <p className="text-xs text-neutral-500">
              {perItemCost ? (
                <>
                  Per-item cost: <strong className="text-neutral-900">${perItemCost}</strong>
                </>
              ) : (
                "Per-item cost appears once both fields are filled."
              )}
            </p>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-neutral-900">Step 2 — Sort into buckets</h2>
          <button type="button" className="btn-secondary text-xs" onClick={() => setLines((l) => [...l, newLine()])}>
            + Add line
          </button>
        </div>
        <p className="text-xs text-neutral-500 mb-3">
          Split the {targetCount || "…"} item{targetCount === 1 ? "" : "s"} above across as many
          destination/type/tag lines as you need, by quantity. Every line shares the same per-item
          cost from Step 1 — nothing to price here.
        </p>
        <div className="flex flex-col gap-3">
          {lines.map((line) => (
            <div
              key={line.id}
              className="grid grid-cols-1 sm:grid-cols-[1.2fr_1.1fr_1.1fr_0.7fr_1.4fr_auto] gap-2 items-end rounded-md border border-neutral-200 p-3"
            >
              <Field label="Destination">
                <select className="input" value={line.show} onChange={(e) => updateLine(line.id, { show: e.target.value as Line["show"] })}>
                  {STANDING_SHOW_DESTINATIONS.map((s) => (
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
              <Field label="Qty">
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="input"
                  value={line.quantity}
                  onChange={(e) => updateLine(line.id, { quantity: e.target.value })}
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
        <p className={`text-xs mt-2 ${countsMatch ? "text-green-700" : "text-neutral-500"}`}>
          Sorted: {sortedCount} / {targetCount || "?"}
          {targetCount > 0 && !countsMatch && " — must match the total item count before you can submit"}
        </p>
      </div>

      {result.error && <p className="text-sm text-red-600">{result.error}</p>}
      {result.success && <p className="text-sm text-green-700">{result.success}</p>}

      <div>
        <button type="submit" disabled={pending || !countsMatch} className="btn-primary">
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
