"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 w-full max-w-sm">
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-neutral-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-800"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
