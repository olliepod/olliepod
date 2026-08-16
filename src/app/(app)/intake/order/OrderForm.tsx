"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ITEM_TYPES,
  TAG_STATUSES,
  INTAKE_DESTINATIONS,
  SHOW_ITEM_TYPES,
  SHOP_ITEM_KINDS,
  isFlatShow,
} from "@/lib/constants";
import ReceiptUpload from "../ReceiptUpload";
import { submitItemizedOrder, type SubmitState } from "./actions";

type Destination = (typeof INTAKE_DESTINATIONS)[number]["value"];
type ItemTypeValue = (typeof ITEM_TYPES)[number]["value"];
type TagStatusValue = (typeof TAG_STATUSES)[number]["value"];

type Line = {
  id: string;
  destination: Destination;
  itemType: ItemTypeValue;
  tagStatus: TagStatusValue;
  brand: string;
  quantity: string;
  description: string;
};

function newLine(): Line {
  return {
    id: crypto.randomUUID(),
    destination: "TORRID_LB",
    itemType: "TOP",
    tagStatus: "PREOWNED",
    brand: "",
    quantity: "1",
    description: "",
  };
}

// Torrid/LB needs a real Type (Top/Bottom/Dress); Shop Item needs a real
// Kind (Bra/Lingerie/Jeans/Other); flat shows don't gate on this, so
// switching into/out of those destinations resets itemType to a sensible
// default for the new destination rather than leaving a stale value that
// isn't a valid option in the new dropdown.
function defaultItemTypeFor(destination: Destination, current: ItemTypeValue): ItemTypeValue {
  if (destination === "TORRID_LB") {
    return SHOW_ITEM_TYPES.some((t) => t.value === current) ? current : "TOP";
  }
  if (destination === "SHOP_ITEM") {
    return SHOP_ITEM_KINDS.some((t) => t.value === current) ? current : "BRA";
  }
  return current;
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
  const lastLineRef = useRef<HTMLDivElement | null>(null);

  const sortedCount = useMemo(() => lines.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0), [lines]);
  const targetCount = Number(totalItemCount) || 0;
  const countsMatch = targetCount > 0 && sortedCount === targetCount;
  const perItemCost = useMemo(() => {
    const price = Number(totalPrice);
    if (!price || targetCount <= 0) return null;
    return (price / targetCount).toFixed(2);
  }, [totalPrice, targetCount]);

  function updateLine(id: string, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const next = { ...l, ...patch };
        if (patch.destination) next.itemType = defaultItemTypeFor(patch.destination, next.itemType);
        return next;
      })
    );
  }

  function removeLine(id: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  }

  function addLine() {
    setLines((prev) => [...prev, newLine()]);
    requestAnimationFrame(() => lastLineRef.current?.scrollIntoView({ block: "nearest" }));
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
        lines: lines.map((l) => {
          const isShopItem = l.destination === "SHOP_ITEM";
          const flat = isFlatShow(l.destination);
          return {
            show: isShopItem ? null : (l.destination as Exclude<Destination, "SHOP_ITEM">),
            itemType: flat ? null : l.itemType,
            tagStatus: flat ? null : l.tagStatus,
            brand: !flat && l.itemType === "JEANS_SHORTS" ? l.brand || undefined : undefined,
            quantity: Number(l.quantity) || 0,
            description: l.description || undefined,
          };
        }),
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
          <button type="button" className="btn-secondary text-xs" onClick={addLine}>
            + Add line
          </button>
        </div>
        <p className="text-xs text-neutral-500 mb-3">
          Split the {targetCount || "…"} item{targetCount === 1 ? "" : "s"} above across as many
          destination lines as you need, by quantity. Every line shares the same per-item cost from
          Step 1 — nothing to price here.
        </p>
        <div className="flex flex-col gap-3">
          {lines.map((line, i) => {
            const isLast = i === lines.length - 1;
            const flat = isFlatShow(line.destination);
            const isShopItem = line.destination === "SHOP_ITEM";
            const typeOptions = line.destination === "TORRID_LB" ? SHOW_ITEM_TYPES : isShopItem ? SHOP_ITEM_KINDS : ITEM_TYPES;
            return (
              <div
                key={line.id}
                ref={isLast ? lastLineRef : undefined}
                className="flex flex-wrap items-end gap-2 rounded-md border border-neutral-200 p-3"
              >
                <div className="w-52">
                  <Field label="Destination">
                    <select
                      className="input"
                      value={line.destination}
                      onChange={(e) => updateLine(line.id, { destination: e.target.value as Destination })}
                    >
                      {INTAKE_DESTINATIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                {!flat && (
                  <div className="w-36">
                    <Field label={isShopItem ? "Kind" : "Type"}>
                      <select
                        className="input"
                        value={line.itemType}
                        onChange={(e) => updateLine(line.id, { itemType: e.target.value as ItemTypeValue })}
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
                {!flat && (
                  <div className="w-32">
                    <Field label="Tag status">
                      <select
                        className="input"
                        value={line.tagStatus}
                        onChange={(e) => updateLine(line.id, { tagStatus: e.target.value as TagStatusValue })}
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
                {!flat && isShopItem && line.itemType === "JEANS_SHORTS" && (
                  <div className="w-36">
                    <Field label="Brand (optional)">
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g. Torrid"
                        value={line.brand}
                        onChange={(e) => updateLine(line.id, { brand: e.target.value })}
                      />
                    </Field>
                  </div>
                )}
                <div className="w-20">
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
                </div>
                <div className="w-44">
                  <Field label="Description (optional)">
                    <input
                      type="text"
                      className="input"
                      value={line.description}
                      onChange={(e) => updateLine(line.id, { description: e.target.value })}
                    />
                  </Field>
                </div>
                <button type="button" className="text-xs text-red-600 hover:underline pb-2" onClick={() => removeLine(line.id)}>
                  Remove
                </button>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <button type="button" className="btn-secondary text-xs" onClick={addLine}>
            + Add line
          </button>
          <p className={`text-xs ${countsMatch ? "text-green-700" : "text-neutral-500"}`}>
            Sorted: {sortedCount} / {targetCount || "?"}
            {targetCount > 0 && !countsMatch && " — must match the total item count before you can submit"}
          </p>
        </div>
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
