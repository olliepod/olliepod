"use server";

import { revalidatePath } from "next/cache";
import { createRaidTrain } from "@/lib/raidTrains";

export type CreateState = { error?: string; success?: string };

export async function submitCreateRaidTrain(
  _prevState: CreateState,
  formData: FormData
): Promise<CreateState> {
  const name = String(formData.get("name") ?? "").trim();
  const raidDate = String(formData.get("raidDate") ?? "");
  const notes = String(formData.get("notes") ?? "") || undefined;

  if (!name) return { error: "Name is required." };
  if (!raidDate) return { error: "Date is required." };

  try {
    await createRaidTrain({ name, raidDate: new Date(raidDate), notes });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create raid train." };
  }

  revalidatePath("/raid-trains");
  return { success: `Created "${name}".` };
}
