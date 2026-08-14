"use server";

import { revalidatePath } from "next/cache";
import { addToDeathPile, markListed } from "@/lib/deathPile";

export type DeathPileState = { error?: string; success?: string };

export async function submitAddToDeathPile(
  _prevState: DeathPileState,
  formData: FormData
): Promise<DeathPileState> {
  const quantity = Number(formData.get("quantity"));
  const note = String(formData.get("note") ?? "") || undefined;

  try {
    await addToDeathPile(quantity, note);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to add to the pile." };
  }

  revalidatePath("/death-pile");
  return { success: `Added ${quantity} item(s).` };
}

export async function submitMarkListed(
  _prevState: DeathPileState,
  formData: FormData
): Promise<DeathPileState> {
  const quantity = Number(formData.get("quantity"));
  const note = String(formData.get("note") ?? "") || undefined;

  try {
    await markListed(quantity, note);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to mark as listed." };
  }

  revalidatePath("/death-pile");
  return { success: `Marked ${quantity} item(s) as listed.` };
}
