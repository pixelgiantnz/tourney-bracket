import type { PoolStatKind } from "@prisma/client";

export type PoolEventRow = { playerId: string; kind: PoolStatKind };

export function countByPlayerKind(
  events: PoolEventRow[],
): Map<string, { made: number; missed: number; foul: number }> {
  const map = new Map<string, { made: number; missed: number; foul: number }>();
  for (const e of events) {
    const cur = map.get(e.playerId) ?? { made: 0, missed: 0, foul: 0 };
    if (e.kind === "MADE") cur.made += 1;
    else if (e.kind === "MISSED") cur.missed += 1;
    else if (e.kind === "FOUL") cur.foul += 1;
    map.set(e.playerId, cur);
  }
  return map;
}

export function teamSunkFromEvents(
  events: PoolEventRow[],
  teamPlayerIds: Set<string>,
): number {
  let n = 0;
  for (const e of events) {
    if (e.kind === "MADE" && teamPlayerIds.has(e.playerId)) n += 1;
  }
  return n;
}

/** First to `raceTo` sunk balls wins when strictly ahead of the opponent. */
export function computeProposedWinnerTeamId(
  teamASunk: number,
  teamBSunk: number,
  raceTo: number,
  teamAId: string,
  teamBId: string,
): string | null {
  if (teamASunk >= raceTo && teamASunk > teamBSunk) return teamAId;
  if (teamBSunk >= raceTo && teamBSunk > teamASunk) return teamBId;
  return null;
}
