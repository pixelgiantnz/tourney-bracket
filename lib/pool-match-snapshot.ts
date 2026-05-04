import { TournamentGameType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { countByPlayerKind, teamSunkFromEvents, type PoolEventRow } from "@/lib/pool-match-live";

export type PoolLivePlayerSnapshot = {
  playerId: string;
  name: string;
  avatarUrl: string | null;
  teamId: string;
  teamName: string;
  made: number;
  missed: number;
  foul: number;
};

export type PoolMatchLiveSnapshot = {
  matchId: string;
  tournamentId: string;
  slug: string;
  raceTo: number;
  isLive: boolean;
  winnerTeamId: string | null;
  proposedWinnerTeamId: string | null;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  teamASunk: number;
  teamBSunk: number;
  eventsVersion: number;
  players: PoolLivePlayerSnapshot[];
};

export async function getPoolMatchLiveSnapshot(
  slug: string,
  matchId: string,
): Promise<PoolMatchLiveSnapshot | null> {
  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    select: { id: true, slug: true, gameType: true, poolRaceTo: true },
  });
  if (!tournament || tournament.gameType !== TournamentGameType.POOL) return null;

  const m = await prisma.match.findFirst({
    where: { id: matchId, tournamentId: tournament.id },
    include: {
      teamA: {
        include: {
          teamPlayers: { include: { player: true }, orderBy: { slotIndex: "asc" } },
        },
      },
      teamB: {
        include: {
          teamPlayers: { include: { player: true }, orderBy: { slotIndex: "asc" } },
        },
      },
      poolStatEvents: { orderBy: { sequence: "asc" } },
    },
  });
  if (!m?.teamAId || !m.teamBId || !m.teamA || !m.teamB) return null;

  const raceTo = m.poolRaceToOverride ?? tournament.poolRaceTo;
  const rows: PoolEventRow[] = m.poolStatEvents.map((e) => ({
    playerId: e.playerId,
    kind: e.kind,
  }));
  const idsA = new Set(m.teamA.teamPlayers.map((tp) => tp.playerId));
  const idsB = new Set(m.teamB.teamPlayers.map((tp) => tp.playerId));
  const counts = countByPlayerKind(rows);

  const players: PoolLivePlayerSnapshot[] = [];
  for (const side of ["A", "B"] as const) {
    const team = side === "A" ? m.teamA : m.teamB;
    if (!team) continue;
    for (const tp of team.teamPlayers) {
      const c = counts.get(tp.playerId) ?? { made: 0, missed: 0, foul: 0 };
      players.push({
        playerId: tp.player.id,
        name: tp.player.name,
        avatarUrl: tp.player.avatarUrl,
        teamId: team.id,
        teamName: team.name,
        made: c.made,
        missed: c.missed,
        foul: c.foul,
      });
    }
  }

  return {
    matchId: m.id,
    tournamentId: tournament.id,
    slug: tournament.slug,
    raceTo,
    isLive: m.isLive,
    winnerTeamId: m.winnerTeamId,
    proposedWinnerTeamId: m.proposedWinnerTeamId,
    teamAId: m.teamAId,
    teamBId: m.teamBId,
    teamAName: m.teamA.name,
    teamBName: m.teamB.name,
    teamASunk: teamSunkFromEvents(rows, idsA),
    teamBSunk: teamSunkFromEvents(rows, idsB),
    eventsVersion: m.poolStatEvents.length,
    players,
  };
}
