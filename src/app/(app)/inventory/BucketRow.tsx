"use client";

import { useActionState, useState } from "react";
import { submitStartingCount, submitDealsStealsTransfer, type ActionState } from "./actions";

const TYPE_LABELS: Record<string, string> = {
  TOP: "Top",
  BOTTOM: "Bottom",
  DRESS: "Dress",
  JEANS_SHORTS: "Jeans/Shorts",
  BRA: "Bra",
  LINGERIE: "Lingerie",
  OTHER: "Other",
};

const TAG_LABELS: Record<string, string> = { PREOWNED: "Preowned", NWT: "NWT" };

type Bucket = {
  id: string;
  show: string | null;
  itemType: string | null;
  tagStatus: string | null;
  countOnHand: number;
  totalCogsValue: string;
  avgCogsValue: string;
};

const initialState: ActionState = {};

export default function BucketRow({ bucket, canMoveToDealsSteals }: { bucket: Bucket; canMoveToDealsSteals: boolean }) {
  const [openForm, setOpenForm] = useState<"none" | "starting" | "transfer">("none");
  const [startingState, startingAction, startingPending] = useActionState(submitStartingCount, initialState);
  const [transferState, transferAction, transferPending] = useActionState(submitDealsStealsTransfer, initialState);

  return (
    <>
      <tr className="border-t border-neutral-200">
        <td className="py-2 pl-4 pr-4 text-sm text-neutral-900">
          {bucket.itemType ? (TYPE_LABELS[bucket.itemType] ?? bucket.itemType) : "All types"}
        </td>
        <td className="py-2 pr-4 text-sm text-neutral-600">
          {bucket.tagStatus ? (TAG_LABELS[bucket.tagStatus] ?? bucket.tagStatus) : "All tags"}
        </td>
        <td className="py-2 pr-4 text-sm text-neutral-900 text-right">{bucket.countOnHand}</td>
        <td className="py-2 pr-4 text-sm text-neutral-600 text-right">${bucket.totalCogsValue}</td>
        <td className="py-2 pr-4 text-sm text-neutral-900 text-right">${bucket.avgCogsValue}</td>
        <td className="py-2 text-right space-x-3 whitespace-nowrap">
          <button
            className="text-xs text-neutral-500 hover:text-neutral-900 underline"
            onClick={() => setOpenForm(openForm === "starting" ? "none" : "starting")}
          >
            Starting count
          </button>
          {canMoveToDealsSteals && (
            <button
              className="text-xs text-neutral-500 hover:text-neutral-900 underline"
              onClick={() => setOpenForm(openForm === "transfer" ? "none" : "transfer")}
            >
              Move to Deals & Steals
            </button>
          )}
        </td>
      </tr>
      {openForm === "starting" && (
        <tr className="bg-neutral-50">
          <td colSpan={6} className="px-4 py-3">
            <form action={startingAction} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="bucketId" value={bucket.id} />
              <Field label="Count">
                <input name="count" type="number" min={1} step={1} required className="input" />
              </Field>
              <Field label="Total COGS ($)">
                <input name="totalCogs" type="number" min={0} step="0.01" required className="input" />
              </Field>
              <Field label="Note (optional)">
                <input name="note" type="text" className="input" />
              </Field>
              <button type="submit" disabled={startingPending} className="btn-primary">
                {startingPending ? "Saving…" : "Add starting count"}
              </button>
              {startingState.error && <p className="text-xs text-red-600 w-full">{startingState.error}</p>}
              {startingState.success && <p className="text-xs text-green-700 w-full">{startingState.success}</p>}
            </form>
          </td>
        </tr>
      )}
      {openForm === "transfer" && (
        <tr className="bg-neutral-50">
          <td colSpan={6} className="px-4 py-3">
            <form action={transferAction} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="fromBucketId" value={bucket.id} />
              <Field label="Quantity">
                <input
                  name="quantity"
                  type="number"
                  min={1}
                  max={bucket.countOnHand}
                  step={1}
                  required
                  className="input"
                />
              </Field>
              <Field label="Note (optional)">
                <input name="note" type="text" className="input" />
              </Field>
              <button type="submit" disabled={transferPending} className="btn-primary">
                {transferPending ? "Moving…" : "Move to Deals & Steals"}
              </button>
              {transferState.error && <p className="text-xs text-red-600 w-full">{transferState.error}</p>}
              {transferState.success && <p className="text-xs text-green-700 w-full">{transferState.success}</p>}
            </form>
          </td>
        </tr>
      )}
    </>
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
