"use server";

import { revalidatePath } from "next/cache";
import { Prisma, PoolStatKind, TournamentGameType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCanRecordPool } from "@/lib/recorder-auth";
import { computeProposedWinnerTeamId } from "@/lib/pool-match-live";
import { setMatchWinner } from "@/lib/tournament-bracket";

/**
 * Revalidates admin + public bracket. Optionally home / players (only when bracket-wide outcomes
 * change — skip for hot pool stat writes so the server action returns faster).
 */
async function revalidatePoolSurfaces(tournamentId: string, globalLists: boolean) {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { slug: true },
  });
  revalidatePath(`/admin/tournaments/${tournamentId}`);
  if (t?.slug) revalidatePath(`/t/${t.slug}`);
  if (globalLists) {
    revalidatePath("/");
    revalidatePath("/players");
  }
}

async function loadMatchForPool(matchId: string) {
  return prisma.match.findUnique({
    where: { id: matchId },
    include: {
      tournament: true,
      teamA: { include: { teamPlayers: true } },
      teamB: { include: { teamPlayers: true } },
    },
  });
}

function assertPoolTournament(m: NonNullable<Awaited<ReturnType<typeof loadMatchForPool>>>) {
  if (m.tournament.gameType !== TournamentGameType.POOL) {
    throw new Error("Not a pool tournament");
  }
}

function assertPoolMatchOpen(m: NonNullable<Awaited<ReturnType<typeof loadMatchForPool>>>) {
  assertPoolTournament(m);
  if (m.winnerTeamId) throw new Error("Match already decided");
  if (!m.teamAId || !m.teamBId) throw new Error("Both teams must be set");
}

/** Uses aggregates only — avoids loading every `PoolStatEvent` inside an interactive transaction (Neon can exceed 5s default). */
async function syncProposedWinnerTx(tx: Prisma.TransactionClient, matchId: string) {
  const m = await tx.match.findUnique({
    where: { id: matchId },
    select: {
      teamAId: true,
      teamBId: true,
      poolRaceToOverride: true,
      tournament: { select: { poolRaceTo: true } },
      teamA: {
        select: { teamPlayers: { select: { playerId: true } } },
      },
      teamB: {
        select: { teamPlayers: { select: { playerId: true } } },
      },
    },
  });
  if (!m?.teamAId || !m.teamBId || !m.teamA || !m.teamB) return;
  const raceTo = m.poolRaceToOverride ?? m.tournament.poolRaceTo;
  const idsA = new Set(m.teamA.teamPlayers.map((tp) => tp.playerId));
  const idsB = new Set(m.teamB.teamPlayers.map((tp) => tp.playerId));

  const madeByPlayer = await tx.poolStatEvent.groupBy({
    by: ["playerId"],
    where: { matchId, kind: PoolStatKind.MADE },
    _count: { _all: true },
  });

  let sunkA = 0;
  let sunkB = 0;
  for (const row of madeByPlayer) {
    const n = row._count._all;
    if (idsA.has(row.playerId)) sunkA += n;
    else if (idsB.has(row.playerId)) sunkB += n;
  }

  const proposed = computeProposedWinnerTeamId(sunkA, sunkB, raceTo, m.teamAId, m.teamBId);
  await tx.match.update({
    where: { id: matchId },
    data: { proposedWinnerTeamId: proposed },
  });
}

export async function setPoolMatchLiveAction(formData: FormData) {
  if (!(await getCanRecordPool())) throw new Error("Not authorized");
  const matchId = String(formData.get("matchId") ?? "");
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const isLive = String(formData.get("isLive") ?? "") === "true";
  if (!matchId || !tournamentId) throw new Error("Invalid");

  const m = await loadMatchForPool(matchId);
  if (!m || m.tournamentId !== tournamentId) throw new Error("Match not found");
  assertPoolTournament(m);
  if (isLive) {
    assertPoolMatchOpen(m);
  }

  await prisma.match.update({
    where: { id: matchId },
    data: { isLive },
  });
  await revalidatePoolSurfaces(tournamentId, false);
}

export async function appendPoolStatAction(formData: FormData) {
  if (!(await getCanRecordPool())) throw new Error("Not authorized");
  const matchId = String(formData.get("matchId") ?? "");
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const playerId = String(formData.get("playerId") ?? "");
  const kindRaw = String(formData.get("kind") ?? "");
  if (!matchId || !tournamentId || !playerId) throw new Error("Invalid");
  const kind =
    kindRaw === "MADE" || kindRaw === "MISSED" || kindRaw === "FOUL"
      ? (kindRaw as PoolStatKind)
      : null;
  if (!kind) throw new Error("Invalid stat");

  const txOpts = { maxWait: 15_000, timeout: 30_000 } as const;

  try {
    await prisma.$transaction(async (tx) => {
      const m = await tx.match.findUnique({
        where: { id: matchId },
        include: {
          tournament: true,
          teamA: { include: { teamPlayers: true } },
          teamB: { include: { teamPlayers: true } },
          poolStatEvents: { orderBy: { sequence: "desc" }, take: 1 },
        },
      });
      if (!m || m.tournamentId !== tournamentId) throw new Error("Match not found");
      assertPoolMatchOpen(m);
      if (m.proposedWinnerTeamId) {
        throw new Error("Confirm or undo the proposed winner before adding stats");
      }

      const allowed = new Set<string>();
      for (const tp of m.teamA?.teamPlayers ?? []) allowed.add(tp.playerId);
      for (const tp of m.teamB?.teamPlayers ?? []) allowed.add(tp.playerId);
      if (!allowed.has(playerId)) throw new Error("Player is not in this match");

      const lastSeq = m.poolStatEvents[0]?.sequence ?? 0;
      const sequence = lastSeq + 1;
      await tx.poolStatEvent.create({
        data: { matchId, playerId, kind, sequence },
      });
      await syncProposedWinnerTx(tx, matchId);
    }, txOpts);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      throw new Error(
        "Database is missing pool tables. Run: npx prisma migrate deploy (or npm run db:migrate)",
      );
    }
    throw e;
  }

  await revalidatePoolSurfaces(tournamentId, false);
}

export async function undoLastPoolStatAction(formData: FormData) {
  if (!(await getCanRecordPool())) throw new Error("Not authorized");
  const matchId = String(formData.get("matchId") ?? "");
  const tournamentId = String(formData.get("tournamentId") ?? "");
  if (!matchId || !tournamentId) throw new Error("Invalid");

  await prisma.$transaction(
    async (tx) => {
      const m = await tx.match.findUnique({
        where: { id: matchId },
        include: {
          tournament: true,
          poolStatEvents: { orderBy: { sequence: "desc" }, take: 1 },
        },
      });
      if (!m || m.tournamentId !== tournamentId) throw new Error("Match not found");
      if (m.tournament.gameType !== TournamentGameType.POOL) throw new Error("Not a pool tournament");
      if (m.winnerTeamId) throw new Error("Match already decided");
      const last = m.poolStatEvents[0];
      if (!last) return;
      await tx.poolStatEvent.delete({ where: { id: last.id } });
      await syncProposedWinnerTx(tx, matchId);
    },
    { maxWait: 15_000, timeout: 30_000 },
  );

  await revalidatePoolSurfaces(tournamentId, false);
}

export async function confirmPoolWinProposalAction(formData: FormData) {
  if (!(await getCanRecordPool())) throw new Error("Not authorized");
  const matchId = String(formData.get("matchId") ?? "");
  const tournamentId = String(formData.get("tournamentId") ?? "");
  if (!matchId || !tournamentId) throw new Error("Invalid");

  const m = await loadMatchForPool(matchId);
  if (!m || m.tournamentId !== tournamentId) throw new Error("Match not found");
  assertPoolMatchOpen(m);
  const winnerTeamId = m.proposedWinnerTeamId;
  if (!winnerTeamId) throw new Error("No proposed winner");

  await setMatchWinner(matchId, winnerTeamId);

  await revalidatePoolSurfaces(tournamentId, true);
}
