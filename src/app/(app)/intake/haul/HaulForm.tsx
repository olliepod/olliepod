"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ITEM_TYPES,
  TAG_STATUSES,
  BINS_THRIFT_SORT_DESTINATIONS,
  SHOW_ITEM_TYPES,
  SHOP_ITEM_KINDS,
  isFlatShow,
} from "@/lib/constants";
import ReceiptUpload from "../ReceiptUpload";
import { submitBinsThriftHaul, type SubmitState } from "./actions";

type Destination = (typeof BINS_THRIFT_SORT_DESTINATIONS)[number]["value"];
type ItemTypeValue = (typeof ITEM_TYPES)[number]["value"];
type TagStatusValue = (typeof TAG_STATUSES)[number]["value"];

type Row = {
  id: string;
  destination: Destination;
  itemType: ItemTypeValue;
  tagStatus: TagStatusValue;
  brand: string;
  quantity: string;
};

function newRow(): Row {
  return {
    id: crypto.randomUUID(),
    destination: "EBAY",
    itemType: "TOP",
    tagStatus: "PREOWNED",
    brand: "",
    quantity: "1",
  };
}

// Torrid/LB needs a real Type (Top/Bottom/Dress); Shop Item needs a real
// Kind (Bra/Lingerie/Jeans/Other); flat shows and Needs-wash don't gate on
// this, so switching into/out of those destinations resets itemType to a
// sensible default for the new destination rather than leaving a stale
// value that isn't a valid option in the new dropdown.
function defaultItemTypeFor(destination: Destination, current: ItemTypeValue): ItemTypeValue {
  if (destination === "TORRID_LB") {
    return SHOW_ITEM_TYPES.some((t) => t.value === current) ? current : "TOP";
  }
  if (destination === "SHOP_ITEM") {
    return SHOP_ITEM_KINDS.some((t) => t.value === current) ? current : "BRA";
  }
  return current;
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
  const lastRowRef = useRef<HTMLDivElement | null>(null);

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
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        if (patch.destination) next.itemType = defaultItemTypeFor(patch.destination, next.itemType);
        return next;
      })
    );
  }

  function removeRow(id: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }

  function addRow() {
    setRows((prev) => [...prev, newRow()]);
    requestAnimationFrame(() => lastRowRef.current?.scrollIntoView({ block: "nearest" }));
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
        sortPiles: rows.map((r) => {
          // Needs-wash never categorizes at intake -- nothing about it is
          // knowable until it's actually been washed/treated (see
          // resolveNeedsWashUnit).
          const noTypeTag = isFlatShow(r.destination) || r.destination === "NEEDS_WASH";
          return {
            destination: r.destination,
            itemType: noTypeTag ? null : r.itemType,
            tagStatus: noTypeTag ? null : r.tagStatus,
            brand: !noTypeTag && r.itemType === "JEANS_SHORTS" ? r.brand || undefined : undefined,
            quantity: Number(r.quantity) || 0,
          };
        }),
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
          <button type="button" className="btn-secondary text-xs" onClick={addRow}>
            + Add row
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {rows.map((row, i) => {
            const isLast = i === rows.length - 1;
            const noTypeTag = isFlatShow(row.destination) || row.destination === "NEEDS_WASH";
            const isShopItem = row.destination === "SHOP_ITEM";
            const typeOptions = row.destination === "TORRID_LB" ? SHOW_ITEM_TYPES : isShopItem ? SHOP_ITEM_KINDS : ITEM_TYPES;
            return (
              <div
                key={row.id}
                ref={isLast ? lastRowRef : undefined}
                className="flex flex-wrap items-end gap-2 rounded-md border border-neutral-200 p-3"
              >
                <div className="w-44">
                  <Field label="Destination">
                    <select
                      className="input"
                      value={row.destination}
                      onChange={(e) => updateRow(row.id, { destination: e.target.value as Destination })}
                    >
                      {BINS_THRIFT_SORT_DESTINATIONS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                {!noTypeTag && (
                  <div className="w-36">
                    <Field label={isShopItem ? "Kind" : "Type"}>
                      <select
                        className="input"
                        value={row.itemType}
                        onChange={(e) => updateRow(row.id, { itemType: e.target.value as ItemTypeValue })}
                      >
                        {typeOptions.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                )}
                {!noTypeTag && (
                  <div className="w-32">
                    <Field label="Tag status">
                      <select
                        className="input"
                        value={row.tagStatus}
                        onChange={(e) => updateRow(row.id, { tagStatus: e.target.value as TagStatusValue })}
                      >
                        {TAG_STATUSES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                )}
                {!noTypeTag && isShopItem && row.itemType === "JEANS_SHORTS" && (
                  <div className="w-36">
                    <Field label="Brand (optional)">
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g. Torrid"
                        value={row.brand}
                        onChange={(e) => updateRow(row.id, { brand: e.target.value })}
                      />
                    </Field>
                  </div>
                )}
                <div className="w-20">
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
                </div>
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline pb-2"
                  onClick={() => removeRow(row.id)}
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
        <div className="mt-2">
          <button type="button" className="btn-secondary text-xs" onClick={addRow}>
            + Add row
          </button>
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
        Sellable items (eBay + Torrid/LB + $3 Pull + $5–8 Pull + Shop Item + Needs-wash):{" "}
        <strong>{sellableCount}</strong>
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
