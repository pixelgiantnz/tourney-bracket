import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, slug: true, status: true },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tournaments</h1>
          <p className="mt-1 text-sm text-muted">Open a bracket (site password required).</p>
        </div>
        <Link
          href="/admin"
          className="rounded-md border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
        >
          Admin
        </Link>
      </div>
      <ul className="mt-10 space-y-3">
        {tournaments.length === 0 ? (
          <li className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-muted">
            No tournaments yet. Sign in to admin to create one.
          </li>
        ) : (
          tournaments.map((t) => (
            <li key={t.id}>
              <Link
                href={`/t/${t.slug}`}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition hover:border-accent"
              >
                <span className="font-medium">{t.name}</span>
                <span className="text-xs uppercase tracking-wide text-muted">{t.status}</span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
