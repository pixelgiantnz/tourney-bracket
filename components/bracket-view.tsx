"use client";

import Image from "next/image";
import { useMemo } from "react";
import { PlayerAvatar } from "@/components/player-avatar";

export type BracketPlayer = {
  id: string;
  name: string;
  avatarUrl: string | null;
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
  teamA: BracketTeam | null;
  teamB: BracketTeam | null;
  winner: BracketTeam | null;
};

export type BracketTournament = {
  name: string;
  logoUrl: string | null;
  trophyImageUrl: string | null;
  playersPerTeam: number;
};

function TeamBlock({
  team,
  playersPerTeam,
  isWinner,
}: {
  team: BracketTeam | null;
  playersPerTeam: number;
  isWinner?: boolean;
}) {
  if (!team) {
    return (
      <div className="flex justify-center">
        <span className="text-muted">—</span>
      </div>
    );
  }
  const size = 44;
  return (
    <div
      className={`flex flex-col items-center gap-0.5 rounded-md p-1 text-center transition-colors ${
        isWinner ? "bg-emerald-500/15 ring-1 ring-emerald-500/50" : ""
      }`}
    >
      <span className="font-medium text-sm">{team.name}</span>
      <div className="flex justify-center gap-1">
        {Array.from({ length: playersPerTeam }, (_, i) => {
          const p = team.players[i];
          if (!p) {
            return (
              <div
                key={i}
                className="rounded-full border border-dashed border-border bg-background"
                style={{ width: size, height: size }}
              />
            );
          }
          return (
            <div key={p.id} style={{ width: size, height: size }}>
              <PlayerAvatar name={p.name} url={p.avatarUrl} size={size} />
            </div>
          );
        })}
      </div>
      <ul className="text-xs text-muted">
        {team.players.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </div>
  );
}

function MatchCard({
  m,
  playersPerTeam,
  isFinalRound,
}: {
  m: BracketMatch;
  playersPerTeam: number;
  isFinalRound: boolean;
}) {
  const wid = m.winner?.id ?? null;
  const decided = Boolean(m.winner);
  const teamsReady = Boolean(m.teamA && m.teamB);
  const awaitingTeams = !teamsReady;

  return (
    <div
      className={`mx-auto w-full max-w-[min(100%,220px)] rounded-lg border p-2 text-center transition-colors ${
        awaitingTeams
          ? "border-border/50 bg-gradient-to-b from-zinc-900/40 via-zinc-900/20 to-card/90 text-muted-foreground shadow-none"
          : decided
            ? "border-emerald-500/60 bg-emerald-950/25 shadow-[0_0_20px_-8px_rgba(16,185,129,0.45)]"
            : "border-border bg-card"
      } ${isFinalRound && !decided && teamsReady ? "ring-1 ring-amber-500/30" : ""}`}
    >
      <div className="space-y-2">
        <TeamBlock
          team={m.teamA}
          playersPerTeam={playersPerTeam}
          isWinner={wid !== null && m.teamA?.id === wid}
        />
        <div className="text-[10px] text-muted">vs</div>
        <TeamBlock
          team={m.teamB}
          playersPerTeam={playersPerTeam}
          isWinner={wid !== null && m.teamB?.id === wid}
        />
      </div>
      {m.winner ? (
        <p className="mt-2 border-t border-emerald-500/30 pt-1.5 text-center text-xs font-medium text-emerald-400">
          Winner: {m.winner.name}
        </p>
      ) : null}
    </div>
  );
}

function ChampionColumn({
  champion,
  trophyUrl,
  logoUrl,
  playersPerTeam,
}: {
  champion: BracketTeam | null;
  trophyUrl: string | null;
  logoUrl: string | null;
  playersPerTeam: number;
}) {
  const avatarSize = 112;
  const awaitingChampion = champion === null;

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center py-0.5 pt-4">
      <div
        className={`relative rounded-2xl border-2 px-5 pb-5 pt-10 sm:px-7 sm:pb-6 sm:pt-11 md:px-9 md:pb-7 md:pt-12 ${
          awaitingChampion
            ? "border-border/50 bg-gradient-to-b from-zinc-900/40 via-zinc-900/20 to-card/90 text-muted-foreground shadow-none"
            : "border-emerald-500/50 bg-gradient-to-b from-emerald-950/55 via-emerald-950/30 to-card shadow-[0_0_40px_-12px_rgba(16,185,129,0.35)]"
        }`}
      >
        {logoUrl ? (
          <div className="pointer-events-none absolute left-1/2 top-[-1px] z-20 -translate-x-1/2 -translate-y-1/2">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 bg-background shadow-lg ring-4 ring-background sm:h-14 sm:w-14 ${
                awaitingChampion
                  ? "border-border/60 opacity-75 grayscale"
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
              ? "text-muted-foreground"
              : "text-emerald-200 drop-shadow-[0_2px_12px_rgba(16,185,129,0.3)]"
          }`}
        >
          Champion
        </p>
        {champion ? (
          <div className="mt-5 flex flex-col items-center text-center sm:mt-6">
            {trophyUrl ? (
              <div className="relative mx-auto shrink-0">
                <div className="absolute -inset-6 bg-emerald-400/10 blur-2xl" aria-hidden />
                <Image
                  src={trophyUrl}
                  alt=""
                  width={176}
                  height={176}
                  className="relative h-[150px] w-[150px] object-contain drop-shadow-[0_8px_28px_rgba(0,0,0,0.5)] sm:h-[176px] sm:w-[176px]"
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
                      className="rounded-full border border-dashed border-emerald-500/40 bg-background/50"
                      style={{ width: avatarSize, height: avatarSize }}
                    />
                  );
                }
                return (
                  <div
                    key={p.id}
                    className="overflow-hidden rounded-full ring-2 ring-emerald-400/60"
                    style={{ width: avatarSize, height: avatarSize }}
                  >
                    <PlayerAvatar name={p.name} url={p.avatarUrl} size={avatarSize} />
                  </div>
                );
              })}
            </div>
            <p className="mt-4 max-w-full text-base font-semibold leading-snug tracking-tight text-emerald-100 sm:text-lg">
              {champion.name}
            </p>
            <ul className="mt-2 space-y-0.5 text-sm text-emerald-200/80">
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
            <p className={`text-center text-base text-muted ${trophyUrl ? "mt-5" : "mt-6"}`}>TBD</p>
          </div>
        )}
      </div>
    </div>
  );
}

function roundLabel(ri: number, maxRound: number): string {
  if (ri === maxRound) return "Final";
  if (ri === maxRound - 1 && maxRound >= 1) return "Semifinals";
  return `Round ${ri + 1}`;
}

export function BracketView({
  tournament,
  matches,
}: {
  tournament: BracketTournament;
  matches: BracketMatch[];
}) {
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

  const colWidth = "w-[220px]";
  const champColWidth = "w-[min(100%,360px)] min-w-[300px] sm:min-w-[340px]";

  const headerBandH = "min-h-[80px]";

  return (
    <div>
      {/* Tournament header */}
      <header className="mb-5 border-b border-border/80 bg-card/40 px-1 pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          {tournament.logoUrl ? (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-background sm:h-20 sm:w-20">
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
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Tournament</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {tournament.name}
            </h1>
          </div>
        </div>
      </header>

      <div className="overflow-x-auto pb-3">
        {/* Round titles — final column no longer holds logo/trophy (moved to header & champion column) */}
        <div className={`flex min-w-min flex-row gap-3`}>
          {rounds.map((ri) => (
            <div key={`head-${ri}`} className={`flex ${colWidth} shrink-0 flex-col`}>
              <h2 className="shrink-0 text-center text-xs font-semibold uppercase tracking-wide text-muted">
                {roundLabel(ri, maxRound)}
              </h2>
              <div className={`mt-2 ${headerBandH} shrink-0 border-b border-transparent pb-2`} aria-hidden />
            </div>
          ))}
          <div className={`flex ${champColWidth} shrink-0 flex-col`}>
            <h2 className="shrink-0 text-center text-xs font-semibold uppercase tracking-wide text-muted">
              Champion
            </h2>
            <div className={`mt-2 ${headerBandH} shrink-0 border-b border-transparent pb-2`} aria-hidden />
          </div>
        </div>

        <div className="mt-1 flex min-h-[min(64vh,720px)] min-w-min flex-row items-stretch gap-3">
          {rounds.map((ri) => {
            const roundMatches = (byRound.get(ri) ?? [])
              .slice()
              .sort((a, b) => a.positionInRound - b.positionInRound);
            return (
              <div
                key={ri}
                className={`flex ${colWidth} shrink-0 flex-col items-center border-l border-border/30 pl-3 first:border-l-0 first:pl-0`}
              >
                <div className="flex min-h-0 w-full flex-1 flex-col items-center">
                  {roundMatches.map((m) => (
                    <div
                      key={m.id}
                      className="flex min-h-0 w-full flex-1 flex-col items-center justify-center py-0.5"
                    >
                      <MatchCard
                        m={m}
                        playersPerTeam={tournament.playersPerTeam}
                        isFinalRound={ri === maxRound}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div
            className={`flex ${champColWidth} shrink-0 flex-col border-l border-emerald-500/20 pl-3`}
          >
            <ChampionColumn
              champion={champion}
              trophyUrl={tournament.trophyImageUrl}
              logoUrl={tournament.logoUrl}
              playersPerTeam={tournament.playersPerTeam}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
