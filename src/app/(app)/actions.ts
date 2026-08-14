"use server";

import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth";

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
