import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-2xl font-semibold text-neutral-900">OlliePod</h1>
        <p className="text-sm text-neutral-500">Enter the password to continue.</p>
      </div>
      <LoginForm next={next ?? "/"} />
    </main>
  );
}
