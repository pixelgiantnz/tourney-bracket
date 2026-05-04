"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { MatchDetailModal } from "@/components/match-detail-modal";
import { PoolLeaderboardModal } from "@/components/pool-leaderboard-modal";
import { PoolLiveMatchModal } from "@/components/pool-live-match-modal";
import { PlayerAvatar } from "@/components/player-avatar";
import { bracketMatchGridLines } from "@/lib/bracket";
import { bracketRoundLabel } from "@/lib/bracket-round-label";
import { getNeonChampionAccent, getNeonRoundAccent } from "@/lib/neon-round-accent";
import type { PlayerMatchStats } from "@/lib/player-stats";
import type { PublicAppearance } from "@/lib/tournament-theme";

export type BracketPlayer = {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  stats: PlayerMatchStats;
};

export type BracketTeam = {
  id: string;
  name: string;
  players: BracketPlayer[];
};

export type BracketMatch = {
  id: string;
  roundIndex: number;
  positionInRound: number;
  /** Same label as column headers (Final, Semifinals, Round n). */
  roundLabel: string;
  isLive: boolean;
  teamA: BracketTeam | null;
  teamB: BracketTeam | null;
  winner: BracketTeam | null;
};

export type BracketTournament = {
  id: string;
  slug: string;
  /** `"POOL"` or `"DEFAULT"` from Prisma enum string. */
  gameType: string;
  name: string;
  logoUrl: string | null;
  trophyImageUrl: string | null;
  playersPerTeam: number;
};

function teamPlayerNamesLine(team: BracketTeam, playersPerTeam: number): string {
  const parts: string[] = [];
  for (let i = 0; i < playersPerTeam; i++) {
    const p = team.players[i];
    parts.push(p ? p.name : "—");
  }
  return parts.join(" & ");
}

function TeamMatchSide({
  team,
  playersPerTeam,
  appearance,
}: {
  team: BracketTeam | null;
  playersPerTeam: number;
  appearance: PublicAppearance;
}) {
  const avatarSize = playersPerTeam > 2 ? 34 : 40;

  if (!team) {
    return (
      <div
        className={`flex min-h-[72px] min-w-0 flex-1 flex-col items-center justify-center rounded-md px-1.5 py-2 sm:px-2 ${
          appearance === "light" ? "bg-zinc-50/70" : "bg-zinc-950/35"
        }`}
      >
        <span className={`text-sm ${appearance === "light" ? "text-zinc-400" : "text-muted"}`}>—</span>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-md px-1.5 py-1.5 sm:px-2">
      <p
        className={`line-clamp-2 w-full text-center text-[11px] font-semibold leading-tight sm:text-xs ${
          appearance === "light" ? "text-zinc-900" : "text-foreground"
        }`}
      >
        {team.name}
      </p>
      <div className="flex w-full flex-col items-center gap-1">
        <div className="flex justify-center px-1">
          <div className="flex -space-x-2 sm:-space-x-2.5">
            {Array.from({ length: playersPerTeam }, (_, i) => {
              const p = team.players[i];
              return (
                <div
                  key={p?.id ?? `slot-${i}`}
                  className="relative shrink-0 rounded-full"
                  style={{ zIndex: playersPerTeam - i }}
                >
                  {p ? (
                    <PlayerAvatar name={p.name} url={p.avatarUrl} size={avatarSize} />
                  ) : (
                    <div
                      className="rounded-full border border-dotted border-border bg-transparent"
                      style={{ width: avatarSize, height: avatarSize }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <p
          className={`line-clamp-3 w-full px-0.5 text-center text-[9px] leading-snug sm:text-[10px] ${
            appearance === "light" ? "text-zinc-600" : "text-muted"
          }`}
        >
          {teamPlayerNamesLine(team, playersPerTeam)}
        </p>
      </div>
    </div>
  );
}

function MatchCard({
  m,
  playersPerTeam,
  isFinalRound,
  appearance,
  roundIndex,
  maxRound,
  onOpenDetail,
}: {
  m: BracketMatch;
  playersPerTeam: number;
  isFinalRound: boolean;
  appearance: PublicAppearance;
  roundIndex: number;
  maxRound: number;
  onOpenDetail?: () => void;
}) {
  const decided = Boolean(m.winner);
  const teamsReady = Boolean(m.teamA && m.teamB);
  const awaitingTeams = !teamsReady;
  const liveBadge = m.isLive && !decided;

  const neonGlow =
    appearance === "neon" ? getNeonRoundAccent(roundIndex, maxRound).matchShellGlow : "";

  const awaitingCls =
    appearance === "light"
      ? "border border-dotted border-zinc-300/90 bg-white text-zinc-500 shadow-sm"
      : appearance === "neon"
        ? `border border-dotted border-border/70 bg-card text-muted shadow-sm ${neonGlow}`
        : "border border-dotted border-border/70 bg-card text-muted shadow-sm";
  const decidedCls =
    appearance === "light"
      ? "border border-emerald-200 bg-emerald-50 text-zinc-900 shadow-sm"
      : appearance === "neon"
        ? `border border-emerald-500/60 bg-emerald-950/25 shadow-[0_0_20px_-8px_rgba(16,185,129,0.45)] ${neonGlow}`
        : "border-emerald-500/60 bg-emerald-950/25 shadow-[0_0_20px_-8px_rgba(16,185,129,0.45)]";
  const finalRing =
    appearance === "light" ? "ring-1 ring-amber-400/35" : "ring-1 ring-amber-500/30";
  const neutralCard =
    appearance === "light"
      ? "border border-zinc-200 bg-white text-zinc-900 shadow-sm"
      : appearance === "neon"
        ? `border-border bg-card ${neonGlow}`
        : "border-border bg-card";
  const winnerLine =
    appearance === "light"
      ? "relative z-10 mt-2 shrink-0 border-t border-emerald-500/35 bg-inherit px-1 pb-0.5 pt-2 text-center text-xs font-medium text-emerald-700"
      : appearance === "neon"
        ? "relative z-10 mt-2 shrink-0 border-t border-emerald-500/40 bg-inherit px-1 pb-0.5 pt-2 text-center text-xs font-medium text-emerald-400"
        : "relative z-10 mt-2 shrink-0 border-t border-emerald-500/30 bg-inherit px-1 pb-0.5 pt-2 text-center text-xs font-medium text-emerald-400";

  /** Solid strip behind VS so the divider paints above team edges; tint follows card state. */
  const vsStrip =
    appearance === "light"
      ? decided
        ? "rounded-sm bg-emerald-50"
        : "rounded-sm bg-zinc-50"
      : decided
        ? appearance === "neon"
          ? "rounded-sm bg-emerald-950/40"
          : "rounded-sm bg-emerald-950/35"
        : "";

  const vsPill =
    appearance === "light"
      ? "bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200/80"
      : awaitingTeams
        ? "bg-card/80 text-muted shadow-sm ring-1 ring-border/50"
        : appearance === "neon"
          ? "bg-transparent text-muted ring-1 ring-cyan-400/35 shadow-[0_0_12px_-2px_rgba(34,211,238,0.2)]"
          : "bg-background/90 text-muted";

  const interactive = Boolean(onOpenDetail);
  const cardShell = `flex w-full flex-col rounded-lg border p-3 transition-colors ${
    awaitingTeams ? awaitingCls : decided ? decidedCls : neutralCard
  } ${isFinalRound && !decided && teamsReady ? finalRing : ""} ${
    interactive ? "cursor-pointer outline-none hover:opacity-[0.97] focus-visible:ring-2 focus-visible:ring-accent" : ""
  }`;

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? "Open match details" : undefined}
      onClick={interactive ? () => onOpenDetail?.() : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpenDetail?.();
              }
            }
          : undefined
      }
      className={cardShell}
    >
      <div className="isolate flex items-stretch gap-2 sm:gap-2.5">
        <TeamMatchSide team={m.teamA} playersPerTeam={playersPerTeam} appearance={appearance} />
        <div
          className={`relative z-20 flex min-w-[2.5rem] shrink-0 flex-col items-center justify-center self-stretch px-1 sm:min-w-[2.75rem] sm:px-2 ${vsStrip}`}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-1/2 top-0 z-0 w-px -translate-x-1/2 bg-border/70"
          />
          <span
            className={`relative z-10 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${vsPill}`}
          >
            {liveBadge ? (
              <span className="text-red-500">live</span>
            ) : (
              "vs"
            )}
          </span>
        </div>
        <TeamMatchSide team={m.teamB} playersPerTeam={playersPerTeam} appearance={appearance} />
      </div>
      {m.winner ? <p className={winnerLine}>Winner: {m.winner.name}</p> : null}
    </div>
  );
}

function ChampionColumn({
  champion,
  trophyUrl,
  logoUrl,
  playersPerTeam,
  appearance,
}: {
  champion: BracketTeam | null;
  trophyUrl: string | null;
  logoUrl: string | null;
  playersPerTeam: number;
  appearance: PublicAppearance;
}) {
  const avatarSize = 112;
  const awaitingChampion = champion === null;

  const champNeonGlow = appearance === "neon" ? getNeonChampionAccent().matchShellGlow : "";

  const champAwaiting =
    appearance === "light"
      ? "border border-dotted border-zinc-300/90 bg-white text-zinc-500 shadow-sm"
      : appearance === "neon"
        ? `border border-dotted border-border/70 bg-card text-muted shadow-sm ${champNeonGlow}`
        : "border border-dotted border-border/70 bg-card text-muted shadow-sm";
  const champDecided =
    appearance === "light"
      ? "border border-emerald-200 bg-emerald-50/95 text-zinc-900 shadow-sm"
      : appearance === "neon"
        ? `border-emerald-500/50 bg-gradient-to-b from-emerald-950/55 via-emerald-950/30 to-card shadow-[0_0_40px_-12px_rgba(16,185,129,0.35)] ${champNeonGlow}`
        : "border-emerald-500/50 bg-gradient-to-b from-emerald-950/55 via-emerald-950/30 to-card shadow-[0_0_40px_-12px_rgba(16,185,129,0.35)]";

  const champTitle =
    appearance === "light"
      ? "text-emerald-900"
      : "text-emerald-200 drop-shadow-[0_2px_12px_rgba(16,185,129,0.3)]";

  const trophyDrop =
    appearance === "light"
      ? "relative h-[150px] w-[150px] object-contain drop-shadow-[0_4px_16px_rgba(15,118,110,0.12)] sm:h-[176px] sm:w-[176px]"
      : "relative h-[150px] w-[150px] object-contain drop-shadow-[0_8px_28px_rgba(0,0,0,0.5)] sm:h-[176px] sm:w-[176px]";

  const nameCls =
    appearance === "light"
      ? "mt-4 max-w-full text-base font-semibold leading-snug tracking-tight text-emerald-900 sm:text-lg"
      : "mt-4 max-w-full text-base font-semibold leading-snug tracking-tight text-emerald-100 sm:text-lg";
  const rosterCls =
    appearance === "light"
      ? "mt-2 space-y-0.5 text-sm text-emerald-800/90"
      : "mt-2 space-y-0.5 text-sm text-emerald-200/80";

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center py-0.5 pt-4">
      <div
        className={`relative rounded-2xl border-2 px-5 pb-5 pt-10 sm:px-7 sm:pb-6 sm:pt-11 md:px-9 md:pb-7 md:pt-12 ${
          awaitingChampion ? champAwaiting : champDecided
        }`}
      >
        {logoUrl ? (
          <div className="pointer-events-none absolute left-1/2 top-[-1px] z-20 -translate-x-1/2 -translate-y-1/2">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 shadow-lg sm:h-14 sm:w-14 ${
                appearance === "light"
                  ? "bg-white ring-4 ring-white"
                  : appearance === "neon"
                    ? "bg-card ring-4 ring-card"
                    : "bg-background ring-4 ring-background"
              } ${
                awaitingChampion
                  ? "border-border/60 opacity-75 grayscale"
                  : appearance === "light"
                    ? "border-emerald-300"
                    : appearance === "neon"
                      ? "border-amber-400/50"
                      : "border-emerald-500/60"
              }`}
            >
              <Image
                src={logoUrl}
                alt=""
                width={48}
                height={48}
                className="h-[85%] w-[85%] object-contain"
                unoptimized
              />
            </div>
          </div>
        ) : null}
        <p
          className={`text-center text-2xl font-black uppercase tracking-[0.1em] sm:text-3xl sm:tracking-[0.14em] ${
            awaitingChampion
              ? appearance === "light"
                ? "text-zinc-500"
                : appearance === "neon"
                  ? "text-amber-200 [text-shadow:0_0_28px_rgba(251,191,36,0.55),0_0_48px_rgba(245,158,11,0.2)]"
                  : "text-muted"
              : champTitle
          }`}
        >
          Champion
        </p>
        {champion ? (
          <div className="mt-5 flex flex-col items-center text-center sm:mt-6">
            {trophyUrl ? (
              <div className="relative mx-auto shrink-0">
                <div
                  className={
                    appearance === "light"
                      ? "absolute -inset-6 bg-emerald-400/20 blur-2xl"
                      : "absolute -inset-6 bg-emerald-400/10 blur-2xl"
                  }
                  aria-hidden
                />
                <Image
                  src={trophyUrl}
                  alt=""
                  width={176}
                  height={176}
                  className={trophyDrop}
                  unoptimized
                />
              </div>
            ) : null}
            <div className={`${trophyUrl ? "mt-5" : "mt-0"} flex justify-center gap-4`}>
              {Array.from({ length: playersPerTeam }, (_, i) => {
                const p = champion.players[i];
                if (!p) {
                  return (
                    <div
                      key={i}
                      className={
                        appearance === "light"
                          ? "rounded-full border border-dotted border-emerald-200 bg-emerald-50/50"
                          : "rounded-full border border-dotted border-emerald-500/40 bg-background/50"
                      }
                      style={{ width: avatarSize, height: avatarSize }}
                    />
                  );
                }
                const ringCls =
                  appearance === "light"
                    ? "overflow-hidden rounded-full ring-2 ring-emerald-300/80"
                    : "overflow-hidden rounded-full ring-2 ring-emerald-400/60";
                return (
                  <div key={p.id} className={ringCls} style={{ width: avatarSize, height: avatarSize }}>
                    <PlayerAvatar name={p.name} url={p.avatarUrl} size={avatarSize} />
                  </div>
                );
              })}
            </div>
            <p className={nameCls}>{champion.name}</p>
            <ul className={rosterCls}>
              {champion.players.map((p) => (
                <li key={p.id}>{p.name}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-5 flex flex-col items-center text-center sm:mt-6">
            {trophyUrl ? (
              <div className="relative mx-auto shrink-0 opacity-90">
                <div className="absolute -inset-6 rounded-full bg-muted/25 blur-2xl" aria-hidden />
                <Image
                  src={trophyUrl}
                  alt=""
                  width={176}
                  height={176}
                  className="relative h-[150px] w-[150px] object-contain opacity-60 grayscale sm:h-[176px] sm:w-[176px]"
                  unoptimized
                />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export function BracketView({
  tournament,
  matches,
  appearance = "light",
  canRecordPool = false,
}: {
  tournament: BracketTournament;
  matches: BracketMatch[];
  appearance?: PublicAppearance;
  /** Admin or official session — pool stat buttons and live toggles. */
  canRecordPool?: boolean;
}) {
  const [detailMatchId, setDetailMatchId] = useState<string | null>(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const detailMatch = useMemo(
    () => matches.find((x) => x.id === detailMatchId) ?? null,
    [matches, detailMatchId],
  );

  const { rounds, byRound, maxRound, champion } = useMemo(() => {
    const byRound = new Map<number, BracketMatch[]>();
    for (const m of matches) {
      const list = byRound.get(m.roundIndex) ?? [];
      list.push(m);
      byRound.set(m.roundIndex, list);
    }
    const rounds = [...byRound.keys()].sort((a, b) => a - b);
    const maxRound = rounds.length ? Math.max(...rounds) : 0;
    const finals = (byRound.get(maxRound) ?? [])
      .slice()
      .sort((a, b) => a.positionInRound - b.positionInRound);
    const champion = finals[0]?.winner ?? null;
    return { rounds, byRound, maxRound, champion };
  }, [matches]);

  const minRound = rounds[0] ?? 0;
  const leafRoundMatchCount = byRound.get(minRound)?.length ?? 0;
  const gridTemplateColumns =
    rounds.length > 0
      ? `${rounds.map(() => "minmax(280px,300px)").join(" ")} minmax(300px,360px)`
      : "minmax(300px,360px)";
  const gridTemplateRows =
    leafRoundMatchCount > 0
      ? `repeat(${leafRoundMatchCount}, auto)`
      : "auto";
  const championGridRow =
    leafRoundMatchCount > 0 ? `1 / ${leafRoundMatchCount + 1}` : "1 / 2";

  const headerSurface =
    appearance === "light"
      ? "mb-6 rounded-xl border border-zinc-200 bg-white px-4 py-4 shadow-sm sm:px-5"
      : appearance === "neon"
        ? "mb-6 rounded-xl border border-cyan-400/25 bg-card/90 px-4 py-4 shadow-[0_0_40px_-16px_rgba(34,211,238,0.15)] backdrop-blur-sm sm:px-5"
        : "mb-6 rounded-lg border border-border/50 bg-card px-4 py-4 sm:px-5";

  const roundHeading =
    appearance === "light"
      ? "shrink-0 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500"
      : "shrink-0 text-center text-xs font-semibold uppercase tracking-wide text-muted";

  const roundHeadingNeonBase =
    "shrink-0 text-center text-xs font-bold uppercase tracking-widest";

  return (
    <div className="w-full">
      {/* Tournament header */}
      <header className={headerSurface}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {tournament.logoUrl ? (
            <div
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border sm:h-20 sm:w-20 ${
                appearance === "light"
                  ? "border-zinc-200 bg-white"
                  : appearance === "neon"
                    ? "border-cyan-400/35 bg-card"
                    : "border-border bg-card"
              }`}
            >
              <Image
                src={tournament.logoUrl}
                alt=""
                fill
                className="object-contain p-1"
                sizes="80px"
                unoptimized
              />
            </div>
          ) : null}
          <div className="min-w-0">
            <p
              className={`text-[10px] font-semibold uppercase tracking-widest ${
                appearance === "light"
                  ? "text-zinc-500"
                  : appearance === "neon"
                    ? "text-cyan-200/80 [text-shadow:0_0_10px_rgba(34,211,238,0.35)]"
                    : "text-muted"
              }`}
            >
              Tournament
            </p>
            <h1
              className={`mt-0.5 text-2xl font-semibold tracking-tight sm:text-3xl ${
                appearance === "light"
                  ? "text-zinc-950"
                  : appearance === "neon"
                    ? "text-white [text-shadow:0_0_24px_rgba(34,211,238,0.35),0_0_48px_rgba(59,130,246,0.15)]"
                    : "text-foreground"
              }`}
            >
              {tournament.name}
            </h1>
          </div>
          </div>
          {tournament.gameType === "POOL" ? (
            <div className="flex shrink-0 justify-end sm:pt-1">
              <button
                type="button"
                onClick={() => setLeaderboardOpen(true)}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                  appearance === "light"
                    ? "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
                    : appearance === "neon"
                      ? "border-cyan-400/40 bg-card text-cyan-100 hover:bg-cyan-950/30"
                      : "border-border bg-card hover:bg-muted/30"
                }`}
              >
                Leaderboard
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="w-full overflow-x-auto pb-3">
        <div className="mx-auto flex w-max min-w-min flex-col text-left">
            {/* Round titles — same column template as the bracket grid below */}
            <div
              className="grid min-w-min gap-x-3 pb-[30px]"
              style={{ gridTemplateColumns }}
            >
              {rounds.map((ri) => (
                <div key={`head-${ri}`} className="min-w-0">
                  <h2
                    className={
                      appearance === "neon"
                        ? `${roundHeadingNeonBase} ${getNeonRoundAccent(ri, maxRound).labelClass}`
                        : roundHeading
                    }
                  >
                    {bracketRoundLabel(ri, maxRound)}
                  </h2>
                </div>
              ))}
              <div className="min-w-0">
                <h2
                  className={
                    appearance === "neon"
                      ? `${roundHeadingNeonBase} ${getNeonChampionAccent().labelClass}`
                      : roundHeading
                  }
                >
                  Champion
                </h2>
              </div>
            </div>

            <div
              className="grid min-h-[min(64vh,720px)] min-w-min items-stretch gap-x-3 gap-y-3"
              style={{ gridTemplateColumns, gridTemplateRows }}
            >
              {rounds.flatMap((ri) => {
                const roundMatches = (byRound.get(ri) ?? [])
                  .slice()
                  .sort((a, b) => a.positionInRound - b.positionInRound);
                const colIdx = rounds.indexOf(ri) + 1;
                const isFirstCol = colIdx === 1;
                const colFrame =
                  appearance === "neon"
                    ? isFirstCol
                      ? ""
                      : getNeonRoundAccent(ri, maxRound).columnClass
                    : isFirstCol
                      ? ""
                      : `border-l ${appearance === "light" ? "border-zinc-200/90" : "border-border/30"}`;
                const colPad = isFirstCol ? "" : "pl-3";
                return roundMatches.map((m) => {
                  const { rowStart, rowEnd } = bracketMatchGridLines(
                    minRound,
                    ri,
                    m.positionInRound,
                  );
                  return (
                    <div
                      key={m.id}
                      style={{ gridColumn: colIdx, gridRow: `${rowStart} / ${rowEnd}` }}
                      className={`flex min-h-0 w-full items-center justify-center px-1 ${colPad} ${colFrame}`}
                    >
                      <MatchCard
                        m={m}
                        playersPerTeam={tournament.playersPerTeam}
                        isFinalRound={ri === maxRound}
                        appearance={appearance}
                        roundIndex={ri}
                        maxRound={maxRound}
                        onOpenDetail={() => setDetailMatchId(m.id)}
                      />
                    </div>
                  );
                });
              })}

              <div
                style={{
                  gridColumn: rounds.length + 1,
                  gridRow: championGridRow,
                }}
                className={`flex min-h-0 h-full min-w-0 flex-col pl-3 ${
                  appearance === "neon"
                    ? getNeonChampionAccent().columnClass
                    : `border-l ${appearance === "light" ? "border-emerald-600/15" : "border-emerald-500/20"}`
                }`}
              >
                <ChampionColumn
                  champion={champion}
                  trophyUrl={tournament.trophyImageUrl}
                  logoUrl={tournament.logoUrl}
                  playersPerTeam={tournament.playersPerTeam}
                  appearance={appearance}
                />
              </div>
            </div>
        </div>
      </div>

      {tournament.gameType === "POOL" ? (
        <PoolLiveMatchModal
          open={detailMatchId !== null}
          onClose={() => setDetailMatchId(null)}
          appearance={appearance}
          slug={tournament.slug}
          tournamentId={tournament.id}
          matchId={detailMatchId}
          canRecord={canRecordPool}
          initialSnapshot={null}
        />
      ) : (
        <MatchDetailModal
          match={detailMatch}
          open={detailMatchId !== null}
          onClose={() => setDetailMatchId(null)}
          appearance={appearance}
        />
      )}

      <PoolLeaderboardModal
        open={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        appearance={appearance}
        slug={tournament.slug}
      />
    </div>
  );
}
