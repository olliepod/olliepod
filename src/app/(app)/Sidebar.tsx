"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/inventory", label: "Inventory" },
  { href: "/intake", label: "Log Intake" },
  { href: "/needs-wash", label: "Needs Wash" },
  { href: "/reconcile", label: "Reconcile" },
  { href: "/raid-trains", label: "Raid Trains" },
  { href: "/death-pile", label: "Death Pile" },
  { href: "/profit", label: "Profit" },
  { href: "/exports", label: "Exports" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="sidebar-panel flex items-center justify-between px-4 py-3 sm:hidden">
        <span className="sidebar-brand text-lg">OlliePod</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-full bg-white/70 p-2 text-[#a83c8f]"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M2.5 5h15M2.5 10h15M2.5 15h15" />
          </svg>
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 sm:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar-panel fixed inset-y-0 left-0 z-50 w-64 shrink-0 flex flex-col justify-between px-4 py-6 transition-transform duration-200 ease-out sm:static sm:z-auto sm:w-56 sm:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          <div className="flex items-center justify-between mb-6 px-2">
            <span className="sidebar-brand text-xl">OlliePod</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="text-[#a83c8f] sm:hidden"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 3l12 12M15 3L3 15" />
              </svg>
            </button>
          </div>
          <nav className="flex flex-col gap-2">
            {NAV_LINKS.map((link) => {
              const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`sidebar-link ${isActive ? "sidebar-link-active" : ""}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="px-2">
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}
