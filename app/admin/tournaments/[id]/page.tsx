import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminDisclosure } from "@/components/admin-disclosure";
import { AdminSortableTeamsList } from "@/components/admin-sortable-teams-list";
import { DeleteTournamentForm } from "@/components/delete-tournament-form";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { prisma } from "@/lib/prisma";
import { parsePublicAppearance } from "@/lib/tournament-theme";
import {
  createTeam,
  generateBracketAction,
  resetMatchResultAction,
  setMatchWinnerAction,
  updateTournamentMeta,
  uploadTournamentAsset,
} from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

export default async function TournamentAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      teams: {
        include: {
          teamPlayers: { include: { player: true }, orderBy: { slotIndex: "asc" } },
        },
        orderBy: [{ seedOrder: "asc" }, { name: "asc" }],
      },
      matches: {
        orderBy: [{ roundIndex: "asc" }, { positionInRound: "asc" }],
        include: {
          teamA: { include: { teamPlayers: { include: { player: true } } } },
          teamB: { include: { teamPlayers: { include: { player: true } } } },
          winner: true,
        },
      },
    },
  });

  if (!tournament) notFound();

  const allPlayers = await prisma.player.findMany({ orderBy: { name: "asc" } });
  const byRound = new Map<number, typeof tournament.matches>();
  for (const m of tournament.matches) {
    const list = byRound.get(m.roundIndex) ?? [];
    list.push(m);
    byRound.set(m.roundIndex, list);
  }
  const roundIndices = [...byRound.keys()].sort((a, b) => a - b);
  const maxRound = roundIndices.length ? Math.max(...roundIndices) : 0;

  const canGenerate =
    tournament.teams.length >= 2 &&
    tournament.teams.every((t) => t.teamPlayers.length === tournament.playersPerTeam);

  return (
    <div>
      <p className="text-sm text-muted">
        <Link href="/admin/tournaments" className="hover:text-foreground">
          ← Tournaments
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{tournament.name}</h1>
      <p className="text-sm text-muted">
        Public URL:{" "}
        <Link href={`/t/${tournament.slug}`} className="text-accent hover:underline">
          /t/{tournament.slug}
        </Link>
        {" · "}
        {tournament.status}
      </p>

      <AdminDisclosure title="Details">
        <form action={updateTournamentMeta} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={tournament.id} />
          <label className="text-sm">
            Name
            <input
              name="name"
              defaultValue={tournament.name}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            Slug
            <input
              name="slug"
              defaultValue={tournament.slug}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Public bracket theme
            <select
              name="publicAppearance"
              defaultValue={parsePublicAppearance(tournament.theme)}
              className="mt-1 block w-full max-w-xs rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="light">Light (default)</option>
              <option value="dark">Dark</option>
              <option value="neon">Neon (retro)</option>
            </select>
            <span className="mt-1 block text-xs text-muted">
              Public /t/… page only; light matches the rest of the site; neon is a dark synthwave-style bracket.
            </span>
          </label>
          <div className="sm:col-span-2">
            <PendingSubmitButton className="text-sm text-accent underline">Save details</PendingSubmitButton>
          </div>
        </form>
        <div className="mt-6 flex flex-wrap gap-8">
          <form action={uploadTournamentAsset} className="flex max-w-sm flex-col gap-2">
            <input type="hidden" name="id" value={tournament.id} />
            <input type="hidden" name="kind" value="logo" />
            <span className="text-sm font-medium">Tournament logo</span>
            <div className="flex gap-3">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-background">
                {tournament.logoUrl ? (
                  <Image
                    src={tournament.logoUrl}
                    alt=""
                    fill
                    className="object-contain p-1"
                    sizes="80px"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] leading-tight text-muted">
                    No logo yet
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <input name="file" type="file" accept="image/png,image/jpeg" required />
                <PendingSubmitButton className="w-fit rounded border border-border px-2 py-1 text-xs">
                  Upload
                </PendingSubmitButton>
              </div>
            </div>
          </form>
          <form action={uploadTournamentAsset} className="flex max-w-sm flex-col gap-2">
            <input type="hidden" name="id" value={tournament.id} />
            <input type="hidden" name="kind" value="trophy" />
            <span className="text-sm font-medium">Trophy image</span>
            <div className="flex gap-3">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-border bg-background">
                {tournament.trophyImageUrl ? (
                  <Image
                    src={tournament.trophyImageUrl}
                    alt=""
                    fill
                    className="object-contain p-1"
                    sizes="112px"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] leading-tight text-muted">
                    No trophy image yet
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <input name="file" type="file" accept="image/png,image/jpeg" required />
                <PendingSubmitButton className="w-fit rounded border border-border px-2 py-1 text-xs">
                  Upload
                </PendingSubmitButton>
              </div>
            </div>
          </form>
        </div>
      </AdminDisclosure>

      <AdminDisclosure title="Teams">
        <p className="text-sm text-muted">
          Each team needs {tournament.playersPerTeam} player(s). Drag the handle (⋮⋮) to set seed order (top = seed 1).
          Expand a team to assign players or set seed by number. Leave a slot as — to clear it.
        </p>
        <form action={createTeam} className="mt-4 flex flex-wrap gap-2">
          <input type="hidden" name="tournamentId" value={tournament.id} />
          <input
            name="name"
            placeholder="Team name"
            required
            className="min-w-[200px] flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <PendingSubmitButton className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">
            Add team
          </PendingSubmitButton>
        </form>

        <AdminSortableTeamsList
          tournamentId={tournament.id}
          playersPerTeam={tournament.playersPerTeam}
          allPlayers={allPlayers.map((p) => ({ id: p.id, name: p.name }))}
          teams={tournament.teams.map((team) => ({
            id: team.id,
            name: team.name,
            seedOrder: team.seedOrder,
            teamPlayers: team.teamPlayers.map((tp) => ({
              slotIndex: tp.slotIndex,
              player: {
                id: tp.player.id,
                name: tp.player.name,
                avatarUrl: tp.player.avatarUrl,
              },
            })),
          }))}
        />
      </AdminDisclosure>

      <section className="mt-10 rounded-lg border border-border bg-card p-4">
        <h2 className="font-medium">Bracket</h2>
        <p className="mt-1 text-sm text-muted">
          Generates a single-elimination bracket with byes if needed. Re-running replaces all matches.
        </p>
        <form action={generateBracketAction} className="mt-4">
          <input type="hidden" name="tournamentId" value={tournament.id} />
          <PendingSubmitButton
            disabled={!canGenerate}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Generate / reset bracket
          </PendingSubmitButton>
          {!canGenerate ? (
            <p className="mt-2 text-xs text-amber-400">
              Need at least two teams and full rosters ({tournament.playersPerTeam} players each).
            </p>
          ) : null}
        </form>
      </section>

      {tournament.matches.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-medium">Matches</h2>
          <div className="mt-4 space-y-8">
            {roundIndices.map((ri) => (
              <div key={ri}>
                <h3 className="text-sm font-medium text-muted">
                  {ri === maxRound ? "Final" : ri === maxRound - 1 ? "Semifinals" : `Round ${ri + 1}`}
                </h3>
                <ul className="mt-2 space-y-3">
                  {(byRound.get(ri) ?? []).map((m) => (
                    <li key={m.id} className="rounded border border-border px-3 py-2 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{m.teamA?.name ?? "—"}</span>
                        <span className="text-muted">vs</span>
                        <span>{m.teamB?.name ?? "—"}</span>
                        {m.winner ? (
                          <span className="ml-auto flex flex-wrap items-center gap-2 text-muted">
                            <span>Winner: {m.winner.name}</span>
                            <form action={resetMatchResultAction}>
                              <input type="hidden" name="matchId" value={m.id} />
                              <input type="hidden" name="tournamentId" value={tournament.id} />
                              <PendingSubmitButton className="rounded border border-amber-500/50 px-2 py-1 text-xs text-amber-400 hover:bg-amber-500/10">
                                Reset result
                              </PendingSubmitButton>
                            </form>
                          </span>
                        ) : m.teamAId && m.teamBId ? (
                          <span className="ml-auto flex flex-wrap gap-2">
                            <form action={setMatchWinnerAction}>
                              <input type="hidden" name="matchId" value={m.id} />
                              <input type="hidden" name="tournamentId" value={tournament.id} />
                              <input type="hidden" name="winnerTeamId" value={m.teamAId!} />
                              <PendingSubmitButton className="rounded border border-border px-2 py-1 text-xs">
                                {m.teamA?.name} wins
                              </PendingSubmitButton>
                            </form>
                            <form action={setMatchWinnerAction}>
                              <input type="hidden" name="matchId" value={m.id} />
                              <input type="hidden" name="tournamentId" value={tournament.id} />
                              <input type="hidden" name="winnerTeamId" value={m.teamBId!} />
                              <PendingSubmitButton className="rounded border border-border px-2 py-1 text-xs">
                                {m.teamB?.name} wins
                              </PendingSubmitButton>
                            </form>
                          </span>
                        ) : (
                          <span className="ml-auto text-xs text-muted">Awaiting teams</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <DeleteTournamentForm tournamentId={tournament.id} tournamentName={tournament.name} />
    </div>
  );
}
