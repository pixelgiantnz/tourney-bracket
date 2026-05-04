import { Prisma, TournamentGameType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PlayerMatchStats = {
  played: number;
  won: number;
  lost: number;
};

export const emptyPlayerMatchStats: PlayerMatchStats = {
  played: 0,
  won: 0,
  lost: 0,
};

export type PlayerPoolStats = {
  played: number;
  won: number;
  lost: number;
  made: number;
  missed: number;
  foul: number;
};

export const emptyPlayerPoolStats: PlayerPoolStats = {
  played: 0,
  won: 0,
  lost: 0,
  made: 0,
  missed: 0,
  foul: 0,
};

export type PlayerListSort =
  | "name"
  | "played"
  | "won"
  | "lost"
  | "poolPlayed"
  | "poolWon"
  | "poolLost"
  | "poolMade"
  | "poolMissed"
  | "poolFoul";
export type SortOrder = "asc" | "desc";

/**
 * Global match stats derived from completed `Match` rows (excludes deleted tournaments).
 */
export async function getStatsForPlayerIds(
  ids: string[],
): Promise<Map<string, PlayerMatchStats>> {
  const out = new Map<string, PlayerMatchStats>();
  if (ids.length === 0) return out;

  const rows = await prisma.$queryRaw<
    Array<{
      playerId: string;
      played: number;
      won: number;
      lost: number;
    }>
  >`
    WITH base AS (
      SELECT
        tp."playerId" AS "playerId",
        m.id AS match_id,
        tp."teamId" AS "teamId",
        m."winnerTeamId" AS "winnerTeamId",
        m."teamAId" AS "teamAId",
        m."teamBId" AS "teamBId"
      FROM "Match" m
      INNER JOIN "Team" t ON t.id = m."teamAId" OR t.id = m."teamBId"
      INNER JOIN "TeamPlayer" tp ON tp."teamId" = t.id
      WHERE m."winnerTeamId" IS NOT NULL
    )
    SELECT
      "playerId",
      COUNT(DISTINCT match_id)::int AS played,
      COUNT(DISTINCT match_id) FILTER (WHERE "winnerTeamId" = "teamId")::int AS won,
      COUNT(DISTINCT match_id) FILTER (
        WHERE "teamAId" IS NOT NULL
          AND "teamBId" IS NOT NULL
          AND "winnerTeamId" IS NOT NULL
          AND "winnerTeamId" <> "teamId"
      )::int AS lost
    FROM base
    WHERE "playerId" IN (${Prisma.join(ids)})
    GROUP BY "playerId"
  `;

  for (const r of rows) {
    out.set(r.playerId, {
      played: r.played,
      won: r.won,
      lost: r.lost,
    });
  }
  return out;
}

/**
 * Bracket W/L in pool tournaments only (`Tournament.gameType = POOL`).
 */
export async function getPoolBracketStatsForPlayerIds(
  ids: string[],
): Promise<Map<string, Pick<PlayerPoolStats, "played" | "won" | "lost">>> {
  const out = new Map<string, Pick<PlayerPoolStats, "played" | "won" | "lost">>();
  if (ids.length === 0) return out;

  const rows = await prisma.$queryRaw<
    Array<{
      playerId: string;
      played: number;
      won: number;
      lost: number;
    }>
  >`
    WITH base AS (
      SELECT
        tp."playerId" AS "playerId",
        m.id AS match_id,
        tp."teamId" AS "teamId",
        m."winnerTeamId" AS "winnerTeamId",
        m."teamAId" AS "teamAId",
        m."teamBId" AS "teamBId"
      FROM "Match" m
      INNER JOIN "Tournament" t ON t.id = m."tournamentId"
      INNER JOIN "Team" tm ON (tm.id = m."teamAId" OR tm.id = m."teamBId")
      INNER JOIN "TeamPlayer" tp ON tp."teamId" = tm.id
      WHERE m."winnerTeamId" IS NOT NULL
        AND t."gameType" = ${TournamentGameType.POOL}::"TournamentGameType"
    )
    SELECT
      "playerId",
      COUNT(DISTINCT match_id)::int AS played,
      COUNT(DISTINCT match_id) FILTER (WHERE "winnerTeamId" = "teamId")::int AS won,
      COUNT(DISTINCT match_id) FILTER (
        WHERE "teamAId" IS NOT NULL
          AND "teamBId" IS NOT NULL
          AND "winnerTeamId" IS NOT NULL
          AND "winnerTeamId" <> "teamId"
      )::int AS lost
    FROM base
    WHERE "playerId" IN (${Prisma.join(ids)})
    GROUP BY "playerId"
  `;

  for (const r of rows) {
    out.set(r.playerId, { played: r.played, won: r.won, lost: r.lost });
  }
  return out;
}

export async function getPoolEventStatsForPlayerIds(
  ids: string[],
): Promise<Map<string, Pick<PlayerPoolStats, "made" | "missed" | "foul">>> {
  const out = new Map<string, Pick<PlayerPoolStats, "made" | "missed" | "foul">>();
  if (ids.length === 0) return out;

  const rows = await prisma.$queryRaw<
    Array<{
      playerId: string;
      made: number;
      missed: number;
      foul: number;
    }>
  >`
    SELECT
      e."playerId" AS "playerId",
      SUM(CASE WHEN e.kind = 'MADE'::"PoolStatKind" THEN 1 ELSE 0 END)::int AS made,
      SUM(CASE WHEN e.kind = 'MISSED'::"PoolStatKind" THEN 1 ELSE 0 END)::int AS missed,
      SUM(CASE WHEN e.kind = 'FOUL'::"PoolStatKind" THEN 1 ELSE 0 END)::int AS foul
    FROM "PoolStatEvent" e
    INNER JOIN "Match" m ON m.id = e."matchId"
    INNER JOIN "Tournament" t ON t.id = m."tournamentId"
    WHERE t."gameType" = ${TournamentGameType.POOL}::"TournamentGameType"
      AND e."playerId" IN (${Prisma.join(ids)})
    GROUP BY e."playerId"
  `;

  for (const r of rows) {
    out.set(r.playerId, { made: r.made, missed: r.missed, foul: r.foul });
  }
  return out;
}

export async function getPoolStatsForPlayerIds(ids: string[]): Promise<Map<string, PlayerPoolStats>> {
  const wl = await getPoolBracketStatsForPlayerIds(ids);
  const ev = await getPoolEventStatsForPlayerIds(ids);
  const out = new Map<string, PlayerPoolStats>();
  for (const id of ids) {
    const w = wl.get(id) ?? { played: 0, won: 0, lost: 0 };
    const e = ev.get(id) ?? { made: 0, missed: 0, foul: 0 };
    out.set(id, { ...w, ...e });
  }
  return out;
}

export async function getPlayersForListing(options: {
  q?: string;
  sort?: PlayerListSort;
  order?: SortOrder;
}): Promise<
  Array<{
    id: string;
    name: string;
    avatarUrl: string | null;
    bio: string | null;
    stats: PlayerMatchStats;
    poolStats: PlayerPoolStats;
  }>
> {
  const q = options.q?.trim();
  const sort = options.sort ?? "name";
  const order = options.order ?? "asc";

  const players = await prisma.player.findMany({
    where: q
      ? { name: { contains: q, mode: "insensitive" } }
      : undefined,
    select: { id: true, name: true, avatarUrl: true, bio: true },
  });

  const ids = players.map((p) => p.id);
  const statsMap = await getStatsForPlayerIds(ids);
  const poolMap = await getPoolStatsForPlayerIds(ids);

  const merged = players.map((p) => ({
    ...p,
    stats: statsMap.get(p.id) ?? emptyPlayerMatchStats,
    poolStats: poolMap.get(p.id) ?? emptyPlayerPoolStats,
  }));

  const mult = order === "desc" ? -1 : 1;
  merged.sort((a, b) => {
    if (sort === "name") {
      const c = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      return mult * c;
    }
    if (sort === "played" || sort === "won" || sort === "lost") {
      const va = a.stats[sort];
      const vb = b.stats[sort];
      if (va !== vb) return mult * (va - vb);
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    }
    const poolKey =
      sort === "poolPlayed"
        ? "played"
        : sort === "poolWon"
          ? "won"
          : sort === "poolLost"
            ? "lost"
            : sort === "poolMade"
              ? "made"
              : sort === "poolMissed"
                ? "missed"
                : "foul";
    const va = a.poolStats[poolKey];
    const vb = b.poolStats[poolKey];
    if (va !== vb) return mult * (va - vb);
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  return merged;
}
