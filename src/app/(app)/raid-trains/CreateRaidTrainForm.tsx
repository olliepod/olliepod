"use client";

import { useActionState, useState } from "react";
import { submitCreateRaidTrain, type CreateState } from "./actions";

const initialState: CreateState = {};

export default function CreateRaidTrainForm() {
  const [state, formAction, pending] = useActionState(submitCreateRaidTrain, initialState);
  const [raidDate, setRaidDate] = useState(() => new Date().toISOString().slice(0, 10));

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
      <h2 className="text-sm font-semibold text-neutral-900">New raid train</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <Field label="Name">
          <input name="name" type="text" required className="input" placeholder="Curvy Carousel Raid Train" />
        </Field>
        <Field label="Date">
          <input
            name="raidDate"
            type="date"
            required
            className="input"
            value={raidDate}
            onChange={(e) => setRaidDate(e.target.value)}
          />
        </Field>
        <Field label="Notes (optional)">
          <input name="notes" type="text" className="input" />
        </Field>
      </div>
      <div>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Creating…" : "Create raid train"}
        </button>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-green-700">{state.success}</p>}
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
