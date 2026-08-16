import Sidebar from "./Sidebar";
import LogoutButton from "./LogoutButton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <aside className="sidebar-panel w-56 shrink-0 flex flex-col justify-between px-4 py-6">
        <div>
          <div className="sidebar-brand text-xl mb-6 px-2">OlliePod</div>
          <Sidebar />
        </div>
        <div className="px-2">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 min-w-0 px-8 py-8">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
