import Link from "next/link";
import LogoutButton from "./LogoutButton";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/inventory", label: "Inventory" },
  { href: "/intake", label: "Log Intake" },
  { href: "/needs-wash", label: "Needs Wash" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-neutral-900">OlliePod</span>
            <nav className="flex items-center gap-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-neutral-600 hover:text-neutral-900"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
