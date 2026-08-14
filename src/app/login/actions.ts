"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";

export type LoginState = { error?: string };

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const password = formData.get("password");
  const next = formData.get("next");

  if (typeof password !== "string" || password.length === 0) {
    return { error: "Password is required." };
  }

  if (password !== process.env.APP_PASSWORD) {
    return { error: "Incorrect password." };
  }

  const token = await createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(typeof next === "string" && next.startsWith("/") ? next : "/");
}
