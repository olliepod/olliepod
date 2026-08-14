"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ITEM_TYPES, TAG_STATUSES, NEEDS_WASH_RESOLUTION_SHOWS } from "@/lib/constants";
import { submitResolveNeedsWash, type SubmitState } from "./actions";

const TYPE_LABELS: Record<string, string> = Object.fromEntries(ITEM_TYPES.map((t) => [t.value, t.label]));

type QueueItem = {
  id: string;
  itemTypeGuess: string | null;
  quantityRemaining: number;
  cogsPerItemValue: string;
  haul: { channel: string; haulDate: string };
};

export default function QueueRow({ item }: { item: QueueItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(String(item.quantityRemaining));
  const [show, setShow] = useState<(typeof NEEDS_WASH_RESOLUTION_SHOWS)[number]["value"]>("TORRID_LB");
  const [itemType, setItemType] = useState((item.itemTypeGuess as string) ?? "TOP");
  const [tagStatus, setTagStatus] = useState<"PREOWNED" | "NWT">("PREOWNED");
  const [result, setResult] = useState<SubmitState>({});
  const [pending, startTransition] = useTransition();

  function handleResolve(e: React.FormEvent) {
    e.preventDefault();
    setResult({});
    startTransition(async () => {
      const res = await submitResolveNeedsWash({
        queueItemId: item.id,
        quantity: Number(quantity) || 0,
        show,
        itemType: itemType as never,
        tagStatus,
      });
      setResult(res);
      if (res.success) {
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-900">
            {item.itemTypeGuess ? TYPE_LABELS[item.itemTypeGuess] : "Unspecified type"} —{" "}
            {item.quantityRemaining} remaining
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">
            From {item.haul.channel === "GOODWILL_BINS" ? "Goodwill Bins" : "Thrift"} haul on{" "}
            {new Date(item.haul.haulDate).toLocaleDateString()} — locked-in COGS $
            {item.cogsPerItemValue}/item
          </p>
        </div>
        <button type="button" className="btn-secondary text-xs" onClick={() => setOpen(!open)}>
          {open ? "Cancel" : "Resolve"}
        </button>
      </div>

      {open && (
        <form onSubmit={handleResolve} className="mt-4 grid grid-cols-1 sm:grid-cols-[0.8fr_1.2fr_1.1fr_1.1fr_auto] gap-2 items-end">
          <Field label="Quantity">
            <input
              type="number"
              min={1}
              max={item.quantityRemaining}
              step={1}
              className="input"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </Field>
          <Field label="Final show">
            <select className="input" value={show} onChange={(e) => setShow(e.target.value as typeof show)}>
              {NEEDS_WASH_RESOLUTION_SHOWS.map((s) => (
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
            <select className="input" value={tagStatus} onChange={(e) => setTagStatus(e.target.value as typeof tagStatus)}>
              {TAG_STATUSES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Saving…" : "Confirm"}
          </button>
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
