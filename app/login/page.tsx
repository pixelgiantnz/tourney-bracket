import { SiteLoginForm } from "./site-login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-xl">
        <h1 className="text-center text-xl font-semibold tracking-tight">Enter site password</h1>
        <p className="mt-2 text-center text-sm text-muted">This tournament site is private.</p>
        <SiteLoginForm next={next ?? "/"} />
      </div>
    </div>
  );
}
