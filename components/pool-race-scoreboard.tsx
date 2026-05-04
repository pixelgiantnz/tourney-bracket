import type { PublicAppearance } from "@/lib/tournament-theme";

function dotCls(
  appearance: PublicAppearance,
  filled: boolean,
  isLast: boolean,
): string {
  const base = "size-2.5 shrink-0 rounded-full sm:size-3";
  if (filled && isLast) {
    return `${base} bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.55)] ring-1 ring-amber-600/50 dark:bg-amber-500 dark:ring-amber-300/40`;
  }
  if (filled) {
    return `${base} bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.45)]`;
  }
  if (isLast) {
    return `${base} bg-black ring-1 ring-zinc-950 dark:ring-zinc-600`;
  }
  return appearance === "light" ? `${base} bg-zinc-300` : `${base} bg-zinc-600`;
}

/** One team: name + one dot per ball in the race (last dot styled as the “8”). */
export function PoolRaceTeamRow({
  teamName,
  sunk,
  raceTo,
  appearance,
}: {
  teamName: string;
  sunk: number;
  raceTo: number;
  appearance: PublicAppearance;
}) {
  const n = Math.max(1, raceTo);
  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <p
        className={`min-w-0 max-w-[42%] truncate text-left text-xs font-semibold sm:max-w-[45%] sm:text-sm ${
          appearance === "light" ? "text-zinc-900" : "text-foreground"
        }`}
        title={teamName}
      >
        {teamName}
      </p>
      <div className="flex min-w-0 flex-1 flex-wrap justify-end gap-1 sm:gap-1.5" aria-label={`${teamName}: ${sunk} of ${n} sunk`}>
        {Array.from({ length: n }, (_, i) => {
          const filled = sunk > i;
          const isLast = i === n - 1;
          return <span key={i} className={dotCls(appearance, filled, isLast)} />;
        })}
      </div>
    </div>
  );
}

/** Stacked rows for both teams (pool game modal). */
export function PoolMatchRaceScoreboard({
  teamAName,
  teamBName,
  teamASunk,
  teamBSunk,
  raceTo,
  appearance,
  className = "",
}: {
  teamAName: string;
  teamBName: string;
  teamASunk: number;
  teamBSunk: number;
  raceTo: number;
  appearance: PublicAppearance;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <PoolRaceTeamRow teamName={teamAName} sunk={teamASunk} raceTo={raceTo} appearance={appearance} />
      <PoolRaceTeamRow teamName={teamBName} sunk={teamBSunk} raceTo={raceTo} appearance={appearance} />
    </div>
  );
}
