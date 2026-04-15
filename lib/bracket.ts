/** Single-elimination bracket helpers. Bracket size P is a power of 2. */

export function nextPowerOf2(n: number): number {
  if (n <= 0) return 1;
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/**
 * Physical slot order for single elimination (first column).
 * perm[k] = seed index (0 .. P-1) at physical slot k.
 */
export function eliminationSeedSlotOrder(size: number): number[] {
  if (size <= 1) return [0];
  if (size === 2) return [0, 1];
  if (size % 2 !== 0) throw new Error("size must be a power of 2");
  const half = size / 2;
  const prev = eliminationSeedSlotOrder(half);
  const out: number[] = [];
  for (let i = 0; i < half; i++) {
    out.push(prev[i]);
    out.push(size - 1 - prev[i]);
  }
  return out;
}

/** Map first-round slots to matches: each pair of adjacent slots is one match. */
export function buildSlotsFromSeededTeams(
  teamIdsOrderedBySeed: string[],
): (string | null)[] {
  const T = teamIdsOrderedBySeed.length;
  if (T === 0) return [];
  const P = nextPowerOf2(T);
  const perm = eliminationSeedSlotOrder(P);
  const slots: (string | null)[] = [];
  for (let k = 0; k < P; k++) {
    const seedIdx = perm[k];
    slots.push(seedIdx < T ? teamIdsOrderedBySeed[seedIdx] : null);
  }
  return slots;
}

export function countRounds(bracketSize: number): number {
  if (bracketSize <= 1) return 0;
  return Math.log2(bracketSize);
}

/** Next match position receives winner from (round, position). */
export function nextMatchPosition(
  roundIndex: number,
  positionInRound: number,
): { roundIndex: number; positionInRound: number; slot: "A" | "B" } {
  return {
    roundIndex: roundIndex + 1,
    positionInRound: Math.floor(positionInRound / 2),
    slot: positionInRound % 2 === 0 ? "A" : "B",
  };
}
