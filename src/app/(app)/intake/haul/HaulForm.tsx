"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ITEM_TYPES, TAG_STATUSES, SELLABLE_SORT_DESTINATIONS } from "@/lib/constants";
import ReceiptUpload from "../ReceiptUpload";
import { submitBinsThriftHaul, type SubmitState } from "./actions";

type Row = {
  id: string;
  destination: (typeof SELLABLE_SORT_DESTINATIONS)[number]["value"];
  itemType: (typeof ITEM_TYPES)[number]["value"];
  tagStatus: (typeof TAG_STATUSES)[number]["value"];
  quantity: string;
};

function newRow(): Row {
  return {
    id: crypto.randomUUID(),
    destination: "EBAY",
    itemType: "TOP",
    tagStatus: "PREOWNED",
    quantity: "1",
  };
}

export default function HaulForm() {
  const router = useRouter();
  const [channel, setChannel] = useState<"GOODWILL_BINS" | "THRIFT">("GOODWILL_BINS");
  const [haulDate, setHaulDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [totalCost, setTotalCost] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [personalQuantity, setPersonalQuantity] = useState("0");
  const [trashQuantity, setTrashQuantity] = useState("0");
  const [receiptKeys, setReceiptKeys] = useState<string[]>([]);
  const [result, setResult] = useState<SubmitState>({});
  const [pending, startTransition] = useTransition();

  const sellableCount = useMemo(
    () => rows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0),
    [rows]
  );
  const estimatedPerItem = useMemo(() => {
    const cost = Number(totalCost);
    if (!cost || sellableCount <= 0) return null;
    return (cost / sellableCount).toFixed(2);
  }, [totalCost, sellableCount]);

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult({});
    startTransition(async () => {
      const res = await submitBinsThriftHaul({
        channel,
        haulDate,
        totalCost,
        notes,
        sortPiles: rows.map((r) => ({
          destination: r.destination,
          itemType: r.itemType,
          tagStatus: r.tagStatus,
          quantity: Number(r.quantity) || 0,
        })),
        personalQuantity: Number(personalQuantity) || 0,
        trashQuantity: Number(trashQuantity) || 0,
        receiptKeys,
      });
      setResult(res);
      if (res.success) {
        setRows([newRow()]);
        setTotalCost("");
        setNotes("");
        setPersonalQuantity("0");
        setTrashQuantity("0");
        setReceiptKeys([]);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-3xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Channel">
          <select
            className="input"
            value={channel}
            onChange={(e) => setChannel(e.target.value as typeof channel)}
          >
            <option value="GOODWILL_BINS">Goodwill Bins</option>
            <option value="THRIFT">Thrift store</option>
          </select>
        </Field>
        <Field label="Haul date">
          <input
            type="date"
            className="input"
            value={haulDate}
            onChange={(e) => setHaulDate(e.target.value)}
            required
          />
        </Field>
        <Field label="Total haul cost ($)">
          <input
            type="number"
            min={0}
            step="0.01"
            className="input"
            value={totalCost}
            onChange={(e) => setTotalCost(e.target.value)}
            required
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Notes (optional)">
          <input
            type="text"
            className="input"
            placeholder="e.g. Goodwill Bins receipt #1234"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        <ReceiptUpload label="Receipt photo(s)" onChange={setReceiptKeys} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-neutral-900">Sorted piles</h2>
          <button type="button" className="btn-secondary text-xs" onClick={() => setRows((r) => [...r, newRow()])}>
            + Add row
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-1 sm:grid-cols-[2fr_1.4fr_1.2fr_0.8fr_auto] gap-2 items-end rounded-md border border-neutral-200 p-3">
              <Field label="Destination">
                <select
                  className="input"
                  value={row.destination}
                  onChange={(e) => updateRow(row.id, { destination: e.target.value as Row["destination"] })}
                >
                  {SELLABLE_SORT_DESTINATIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Type">
                <select
                  className="input"
                  value={row.itemType}
                  onChange={(e) => updateRow(row.id, { itemType: e.target.value as Row["itemType"] })}
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
                  value={row.tagStatus}
                  onChange={(e) => updateRow(row.id, { tagStatus: e.target.value as Row["tagStatus"] })}
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
                  min={0}
                  step={1}
                  className="input"
                  value={row.quantity}
                  onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
                />
              </Field>
              <button
                type="button"
                className="text-xs text-red-600 hover:underline pb-2"
                onClick={() => removeRow(row.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Personal (excluded, not for resale)">
          <input
            type="number"
            min={0}
            step={1}
            className="input"
            value={personalQuantity}
            onChange={(e) => setPersonalQuantity(e.target.value)}
          />
        </Field>
        <Field label="Trash (loss, absorbed into sellable COGS)">
          <input
            type="number"
            min={0}
            step={1}
            className="input"
            value={trashQuantity}
            onChange={(e) => setTrashQuantity(e.target.value)}
          />
        </Field>
      </div>

      <div className="rounded-md bg-neutral-50 border border-neutral-200 px-4 py-3 text-sm text-neutral-700">
        Sellable items (eBay + Torrid/LB + Random $3 + Needs-wash): <strong>{sellableCount}</strong>
        {estimatedPerItem && (
          <>
            {" "}
            — estimated per-item COGS: <strong>${estimatedPerItem}</strong>
          </>
        )}
      </div>

      {result.error && <p className="text-sm text-red-600">{result.error}</p>}
      {result.success && <p className="text-sm text-green-700">{result.success}</p>}

      <div>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Logging haul…" : "Log haul"}
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
