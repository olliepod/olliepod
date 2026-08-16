"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { logout } from "./actions";

export default function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(async () => {
        await logout();
        router.push("/login");
        router.refresh();
      })}
      disabled={pending}
      className="text-sm font-medium text-[#7c4fa8] hover:text-[#a83c8f]"
    >
      Sign out
    </button>
  );
}
