import { PoolStatKind, TournamentGameType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PoolLeaderMetric = "made" | "missed" | "foul" | "matches_won";

export type PoolLeaderRow = {
  playerId: string;
  name: string;
  avatarUrl: string | null;
  value: number;
};

export async function getPoolTournamentLeaderboard(
  tournamentId: string,
  metric: PoolLeaderMetric,
): Promise<PoolLeaderRow[]> {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { gameType: true },
  });
  if (!t || t.gameType !== TournamentGameType.POOL) return [];

  if (metric === "matches_won") {
    const rows = await prisma.$queryRaw<
      Array<{ playerId: string; name: string; avatarUrl: string | null; value: number }>
    >`
      WITH wins AS (
        SELECT m.id AS match_id, m."winnerTeamId" AS winner_id
        FROM "Match" m
        WHERE m."tournamentId" = ${tournamentId} AND m."winnerTeamId" IS NOT NULL
      )
      SELECT p.id AS "playerId", p.name, p."avatarUrl", COUNT(DISTINCT w.match_id)::int AS value
      FROM wins w
      INNER JOIN "TeamPlayer" tp ON tp."teamId" = w.winner_id
      INNER JOIN "Player" p ON p.id = tp."playerId"
      GROUP BY p.id, p.name, p."avatarUrl"
      ORDER BY value DESC, p.name ASC
      LIMIT 10
    `;
    return rows.map((r) => ({
      playerId: r.playerId,
      name: r.name,
      avatarUrl: r.avatarUrl,
      value: r.value,
    }));
  }

  const kind: PoolStatKind =
    metric === "made" ? "MADE" : metric === "missed" ? "MISSED" : "FOUL";

  const grouped = await prisma.poolStatEvent.groupBy({
    by: ["playerId"],
    where: {
      kind,
      match: { tournamentId },
    },
    _count: { _all: true },
  });

  if (grouped.length === 0) return [];

  grouped.sort((a, b) => b._count._all - a._count._all);
  const top = grouped.slice(0, 10);

  const players = await prisma.player.findMany({
    where: { id: { in: top.map((g) => g.playerId) } },
    select: { id: true, name: true, avatarUrl: true },
  });
  const byId = new Map(players.map((p) => [p.id, p]));

  return top.map((g) => {
    const p = byId.get(g.playerId);
    return {
      playerId: g.playerId,
      name: p?.name ?? "?",
      avatarUrl: p?.avatarUrl ?? null,
      value: g._count._all,
    };
  });
}
