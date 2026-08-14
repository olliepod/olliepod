"use client";

import { useActionState } from "react";
import { submitAddToDeathPile, submitMarkListed, type DeathPileState } from "./actions";

const initialState: DeathPileState = {};

export default function DeathPileForms({ hasPile }: { hasPile: boolean }) {
  const [addState, addAction, addPending] = useActionState(submitAddToDeathPile, initialState);
  const [listedState, listedAction, listedPending] = useActionState(submitMarkListed, initialState);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <form action={addAction} className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold text-neutral-900">
          {hasPile ? "Add to the pile" : "Set starting count"}
        </h2>
        <p className="text-xs text-neutral-500">
          {hasPile ? "Found more unlisted items? Add them here." : "How many unlisted items are in the pile?"}
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Quantity">
            <input name="quantity" type="number" min={1} step={1} required className="input" />
          </Field>
          <Field label="Note (optional)">
            <input name="note" type="text" className="input" />
          </Field>
          <button type="submit" disabled={addPending} className="btn-primary">
            {addPending ? "Saving…" : hasPile ? "Add" : "Set count"}
          </button>
        </div>
        {addState.error && <p className="text-xs text-red-600">{addState.error}</p>}
        {addState.success && <p className="text-xs text-green-700">{addState.success}</p>}
      </form>

      <form action={listedAction} className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Mark as listed</h2>
        <p className="text-xs text-neutral-500">
          Listed one or a batch on eBay? Decrement the pile by that many.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Quantity">
            <input name="quantity" type="number" min={1} step={1} required disabled={!hasPile} className="input" />
          </Field>
          <Field label="Note (optional)">
            <input name="note" type="text" disabled={!hasPile} className="input" />
          </Field>
          <button type="submit" disabled={listedPending || !hasPile} className="btn-primary">
            {listedPending ? "Saving…" : "Mark listed"}
          </button>
        </div>
        {listedState.error && <p className="text-xs text-red-600">{listedState.error}</p>}
        {listedState.success && <p className="text-xs text-green-700">{listedState.success}</p>}
      </form>
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
