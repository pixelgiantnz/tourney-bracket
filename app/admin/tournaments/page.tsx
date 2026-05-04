import Link from "next/link";
import { TournamentGameType } from "@prisma/client";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { prisma } from "@/lib/prisma";
import { createTournament } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

export default async function TournamentsPage() {
  const list = await prisma.tournament.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { teams: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Tournaments</h1>

      <form action={createTournament} className="mt-8 grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
        <label className="block text-sm">
          Name
          <input name="name" required className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </label>
        <label className="block text-sm">
          URL slug (optional)
          <input
            name="slug"
            placeholder="auto from name"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          Players per team
          <input
            name="playersPerTeam"
            type="number"
            min={1}
            max={8}
            defaultValue={2}
            className="mt-1 w-full max-w-[120px] rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          Game type
          <select
            name="gameType"
            defaultValue={TournamentGameType.DEFAULT}
            className="mt-1 w-full max-w-xs rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value={TournamentGameType.DEFAULT}>Default bracket</option>
            <option value={TournamentGameType.POOL}>Pool (billiards)</option>
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          Pool race-to (sunk balls to win a match)
          <input
            name="poolRaceTo"
            type="number"
            min={1}
            max={99}
            defaultValue={5}
            className="mt-1 w-full max-w-[120px] rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <div className="sm:col-span-2">
          <PendingSubmitButton className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Create tournament
          </PendingSubmitButton>
        </div>
      </form>

      <ul className="mt-10 space-y-2">
        {list.map((t) => (
          <li key={t.id}>
            <Link
              href={`/admin/tournaments/${t.id}`}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:border-accent"
            >
              <span>{t.name}</span>
              <span className="text-xs text-muted">
                {t._count.teams} teams · {t.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
