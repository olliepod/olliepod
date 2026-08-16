"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ITEM_TYPES,
  TAG_STATUSES,
  NEEDS_WASH_RESOLUTION_SHOWS,
  SHOW_ITEM_TYPES,
  SHOP_ITEM_KINDS,
  isFlatShow,
} from "@/lib/constants";
import { submitResolveNeedsWash, type SubmitState } from "./actions";

type Destination = (typeof NEEDS_WASH_RESOLUTION_SHOWS)[number]["value"];
type ItemTypeValue = (typeof ITEM_TYPES)[number]["value"];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(ITEM_TYPES.map((t) => [t.value, t.label]));

type QueueItem = {
  id: string;
  itemTypeGuess: string | null;
  quantityRemaining: number;
  cogsPerItemValue: string;
  haul: { channel: string; haulDate: string };
};

function defaultItemTypeFor(destination: Destination, current: ItemTypeValue): ItemTypeValue {
  if (destination === "TORRID_LB") {
    return SHOW_ITEM_TYPES.some((t) => t.value === current) ? current : "TOP";
  }
  if (destination === "SHOP_ITEM") {
    return SHOP_ITEM_KINDS.some((t) => t.value === current) ? current : "BRA";
  }
  return current;
}

export default function QueueRow({ item }: { item: QueueItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(String(item.quantityRemaining));
  const [destination, setDestination] = useState<Destination>("TORRID_LB");
  const [itemType, setItemType] = useState<ItemTypeValue>((item.itemTypeGuess as ItemTypeValue) ?? "TOP");
  const [tagStatus, setTagStatus] = useState<"PREOWNED" | "NWT">("PREOWNED");
  const [result, setResult] = useState<SubmitState>({});
  const [pending, startTransition] = useTransition();

  const flat = isFlatShow(destination);
  const isShopItem = destination === "SHOP_ITEM";
  const typeOptions = destination === "TORRID_LB" ? SHOW_ITEM_TYPES : isShopItem ? SHOP_ITEM_KINDS : ITEM_TYPES;

  function handleDestinationChange(next: Destination) {
    setDestination(next);
    setItemType((current) => defaultItemTypeFor(next, current));
  }

  function handleResolve(e: React.FormEvent) {
    e.preventDefault();
    setResult({});
    startTransition(async () => {
      const res = await submitResolveNeedsWash({
        queueItemId: item.id,
        quantity: Number(quantity) || 0,
        show: isShopItem ? null : (destination as never),
        itemType: flat ? null : itemType,
        tagStatus: flat ? null : tagStatus,
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
        <form onSubmit={handleResolve} className="mt-4 flex flex-wrap items-end gap-2">
          <div className="w-24">
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
          </div>
          <div className="w-52">
            <Field label="Final destination">
              <select className="input" value={destination} onChange={(e) => handleDestinationChange(e.target.value as Destination)}>
                {NEEDS_WASH_RESOLUTION_SHOWS.map((s) => (
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
                <select className="input" value={itemType} onChange={(e) => setItemType(e.target.value as ItemTypeValue)}>
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
                <select className="input" value={tagStatus} onChange={(e) => setTagStatus(e.target.value as typeof tagStatus)}>
                  {TAG_STATUSES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}
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
