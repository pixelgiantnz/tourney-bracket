/** Human-readable round name for bracket columns and match modals (shared server + client). */
export function bracketRoundLabel(ri: number, maxRound: number): string {
  if (ri === maxRound) return "Final";
  if (ri === maxRound - 1 && maxRound >= 1) return "Semifinals";
  return `Round ${ri + 1}`;
}
