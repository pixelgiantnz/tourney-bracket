import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { emptyPlayerMatchStats, getStatsForPlayerIds } from "@/lib/player-stats";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await prisma.player.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: p ? `${p.name} · Player` : "Player" };
}

export default async function PlayerProfilePage({ params }: Props) {
  const { id } = await params;
  const player = await prisma.player.findUnique({
    where: { id },
    select: { id: true, name: true, avatarUrl: true, bio: true },
  });
  if (!player) notFound();

  const statsMap = await getStatsForPlayerIds([player.id]);
  const stats = statsMap.get(player.id) ?? emptyPlayerMatchStats;

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <p className="text-sm text-muted">
        <Link href="/players" className="hover:text-foreground">
          ← Players
        </Link>
      </p>

      <header className="mt-6 flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
        <div className="shrink-0">
          {player.avatarUrl ? (
            <div className="relative h-28 w-28 overflow-hidden rounded-full ring-2 ring-border">
              <Image
                src={player.avatarUrl}
                alt=""
                width={112}
                height={112}
                className="h-full w-full object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-border text-3xl font-medium ring-2 ring-border">
              {player.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="mt-4 min-w-0 sm:ml-6 sm:mt-0">
          <h1 className="text-2xl font-semibold tracking-tight">{player.name}</h1>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-center sm:text-left">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">Played</dt>
              <dd className="text-lg font-semibold tabular-nums">{stats.played}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">Won</dt>
              <dd className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {stats.won}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">Lost</dt>
              <dd className="text-lg font-semibold tabular-nums">{stats.lost}</dd>
            </div>
          </dl>
        </div>
      </header>

      {player.bio ? (
        <section className="mt-8 rounded-lg border border-border bg-card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">About</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {player.bio}
          </p>
        </section>
      ) : null}
    </div>
  );
}
