"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <nav className="flex flex-col gap-2">
      {NAV_LINKS.map((link) => {
        const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`sidebar-link ${isActive ? "sidebar-link-active" : ""}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
