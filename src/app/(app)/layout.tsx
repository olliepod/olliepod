import Sidebar from "./Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col sm:flex-row">
      <Sidebar />
      <main className="flex-1 min-w-0 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
