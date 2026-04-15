/**
 * Per-column neon accents for the public bracket (distance from final round).
 * Final column → gold; semi → pink; quarters → cyan; earlier → orange.
 */

export type NeonRoundKey = "gold" | "pink" | "cyan" | "orange";

export type NeonRoundAccent = {
  key: NeonRoundKey;
  /** Round / Champion column title */
  labelClass: string;
  /** Outer column frame (border / glow) */
  columnClass: string;
  /** Match card outer ring / glow */
  matchShellGlow: string;
};

const gold: NeonRoundAccent = {
  key: "gold",
  labelClass:
    "text-amber-200 [text-shadow:0_0_12px_rgba(251,191,36,0.55),0_0_24px_rgba(245,158,11,0.25)]",
  columnClass:
    "border-l border-amber-400/40 shadow-[inset_4px_0_20px_-8px_rgba(251,191,36,0.12)]",
  matchShellGlow: "shadow-[0_0_0_1px_rgba(251,191,36,0.35),0_0_20px_-6px_rgba(245,158,11,0.25)]",
};

const pink: NeonRoundAccent = {
  key: "pink",
  labelClass:
    "text-fuchsia-300 [text-shadow:0_0_12px_rgba(232,121,249,0.5),0_0_22px_rgba(217,70,239,0.2)]",
  columnClass:
    "border-l border-fuchsia-500/35 shadow-[inset_4px_0_20px_-8px_rgba(217,70,239,0.1)]",
  matchShellGlow: "shadow-[0_0_0_1px_rgba(232,121,249,0.35),0_0_18px_-6px_rgba(217,70,239,0.22)]",
};

const cyan: NeonRoundAccent = {
  key: "cyan",
  labelClass:
    "text-cyan-300 [text-shadow:0_0_12px_rgba(34,211,238,0.45),0_0_22px_rgba(6,182,212,0.2)]",
  columnClass:
    "border-l border-cyan-400/35 shadow-[inset_4px_0_20px_-8px_rgba(34,211,238,0.1)]",
  matchShellGlow: "shadow-[0_0_0_1px_rgba(34,211,238,0.35),0_0_18px_-6px_rgba(6,182,212,0.2)]",
};

const orange: NeonRoundAccent = {
  key: "orange",
  labelClass:
    "text-orange-300 [text-shadow:0_0_12px_rgba(251,146,60,0.45),0_0_22px_rgba(249,115,22,0.2)]",
  columnClass:
    "border-l border-orange-400/40 shadow-[inset_4px_0_20px_-8px_rgba(251,146,60,0.1)]",
  matchShellGlow: "shadow-[0_0_0_1px_rgba(251,146,60,0.35),0_0_18px_-6px_rgba(249,115,22,0.2)]",
};

export function getNeonRoundAccent(ri: number, maxRound: number): NeonRoundAccent {
  const d = maxRound - ri;
  if (d <= 0) return gold;
  if (d === 1) return pink;
  if (d === 2) return cyan;
  return orange;
}

/** Champion column — always gold capstone */
export function getNeonChampionAccent(): NeonRoundAccent {
  return gold;
}
