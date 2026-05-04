import Link from "next/link";
import { OfficialLoginForm } from "./official-login-form";

export default async function OfficialLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const configured = Boolean(process.env.OFFICIAL_PASSWORD?.length);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-xl">
        <h1 className="text-center text-xl font-semibold tracking-tight">Game official</h1>
        <p className="mt-2 text-center text-sm text-muted">
          Record pool stats on live matches (no full admin access).
        </p>
        {!configured ? (
          <p className="mt-6 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            <code className="text-xs">OFFICIAL_PASSWORD</code> is not set on this server. Ask the host to add it
            to the environment.
          </p>
        ) : (
          <OfficialLoginForm next={next ?? "/"} />
        )}
        <p className="mt-6 text-center text-xs text-muted">
          <Link href="/login" className="text-accent hover:underline">
            Site password
          </Link>
        </p>
      </div>
    </div>
  );
}
