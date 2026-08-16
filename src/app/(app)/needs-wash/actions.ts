"use server";

import { revalidatePath } from "next/cache";
import { resolveNeedsWashUnit, type ResolveNeedsWashInput } from "@/lib/hauls";

export type SubmitState = { error?: string; success?: string };

export async function submitResolveNeedsWash(input: ResolveNeedsWashInput): Promise<SubmitState> {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    return { error: "Quantity must be a positive whole number." };
  }

  try {
    await resolveNeedsWashUnit(input);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to resolve item." };
  }

  revalidatePath("/needs-wash");
  revalidatePath("/inventory");
  revalidatePath("/");
  const outcome = input.outcome === "DISCARDED" ? "discarded" : "resolved";
  return { success: `${input.quantity} unit(s) ${outcome}.` };
}
