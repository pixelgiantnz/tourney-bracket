import { Prisma } from "@prisma/client";
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

export type PlayerListSort = "name" | "played" | "won" | "lost";
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

  const merged = players.map((p) => ({
    ...p,
    stats: statsMap.get(p.id) ?? emptyPlayerMatchStats,
  }));

  const mult = order === "desc" ? -1 : 1;
  merged.sort((a, b) => {
    if (sort === "name") {
      const c = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      return mult * c;
    }
    const va = a.stats[sort];
    const vb = b.stats[sort];
    if (va !== vb) return mult * (va - vb);
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  return merged;
}
