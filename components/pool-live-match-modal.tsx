"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { PlayerAvatar } from "@/components/player-avatar";
import { PendingSpinner } from "@/components/pending-submit-button";
import { PoolMatchRaceScoreboard } from "@/components/pool-race-scoreboard";
import type { PoolMatchLiveSnapshot } from "@/lib/pool-match-snapshot";
import type { PublicAppearance } from "@/lib/tournament-theme";
import {
  appendPoolStatAction,
  confirmPoolWinProposalAction,
  setPoolMatchLiveAction,
  undoLastPoolStatAction,
} from "@/lib/actions/pool-live";

function surface(appearance: PublicAppearance) {
  return appearance === "light"
    ? "bg-white text-zinc-900 border-zinc-200"
    : appearance === "neon"
      ? "bg-card text-foreground border-cyan-500/25"
      : "bg-card text-foreground border-border";
}

function mutedCls(appearance: PublicAppearance) {
  return appearance === "light" ? "text-zinc-600" : "text-muted";
}

function statGrid(
  s: PoolMatchLiveSnapshot,
  appearance: PublicAppearance,
  canRecord: boolean,
  matchId: string,
  tournamentId: string,
  locked: boolean,
  pendingKey: string | null,
  onSubmitAction: (key: string, fn: (fd: FormData) => Promise<void>, e: FormEvent<HTMLFormElement>) => void,
) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {[s.teamAId, s.teamBId].map((tid) => {
        const teamName = tid === s.teamAId ? s.teamAName : s.teamBName;
        const sunk = tid === s.teamAId ? s.teamASunk : s.teamBSunk;
        const players = s.players.filter((p) => p.teamId === tid);
        return (
          <div key={tid} className="rounded-lg border border-border/60 p-4">
            <h3 className="text-center text-sm font-semibold sm:text-left">{teamName}</h3>
            <p className={`mt-1 text-center text-xs tabular-nums sm:text-left ${mutedCls(appearance)}`}>
              Sunk (team): {sunk} / {s.raceTo}
            </p>
            <ul className="mt-4 space-y-4">
              {players.map((p) => (
                <li key={p.playerId}>
                  <div className="flex gap-3">
                    <div className="shrink-0 overflow-hidden rounded-full ring-1 ring-border">
                      <PlayerAvatar name={p.name} url={p.avatarUrl} size={48} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/players/${p.playerId}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {p.name}
                      </Link>
                      <p className={`mt-0.5 text-xs tabular-nums ${mutedCls(appearance)}`}>
                        Sunk {p.made} · Miss {p.missed} · Fouls {p.foul}
                      </p>
                      {canRecord && !s.winnerTeamId && !s.proposedWinnerTeamId ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(["MADE", "MISSED", "FOUL"] as const).map((kind) => {
                            const k = `append-${p.playerId}-${kind}`;
                            return (
                              <form
                                key={kind}
                                onSubmit={(e) => onSubmitAction(k, appendPoolStatAction, e)}
                                className="inline"
                              >
                                <input type="hidden" name="matchId" value={matchId} />
                                <input type="hidden" name="tournamentId" value={tournamentId} />
                                <input type="hidden" name="playerId" value={p.playerId} />
                                <input type="hidden" name="kind" value={kind} />
                                <button
                                  type="submit"
                                  disabled={locked || !s.isLive}
                                  className="inline-flex touch-manipulation items-center justify-center gap-1.5 rounded-md border border-border px-2.5 py-2 text-xs font-medium hover:bg-muted/40 disabled:opacity-40"
                                  title={!s.isLive ? "Start live first" : undefined}
                                >
                                  {pendingKey === k ? <PendingSpinner /> : null}
                                  <span>
                                    {kind === "MADE"
                                      ? "Shot made"
                                      : kind === "MISSED"
                                        ? "Missed"
                                        : "Foul"}
                                  </span>
                                </button>
                              </form>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function PoolLiveMatchModal({
  open,
  onClose,
  appearance,
  slug,
  tournamentId,
  matchId,
  canRecord,
  initialSnapshot,
}: {
  open: boolean;
  onClose: () => void;
  appearance: PublicAppearance;
  slug: string;
  tournamentId: string;
  matchId: string | null;
  canRecord: boolean;
  initialSnapshot: PoolMatchLiveSnapshot | null;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const mutatingRef = useRef(false);
  /** Latest match the user asked for — poll responses must match this or they are dropped (avoids flicker when switching games). */
  const activeMatchIdRef = useRef<string | null>(matchId);
  activeMatchIdRef.current = matchId;

  /**
   * Bumped only after a successful server mutation. Each poll snapshots this at start and
   * applies the response only if it still matches — drops stale in-flight fetches after a
   * mutation without invalidating other polls (which `++` on every poll caused).
   */
  const pollEpochRef = useRef(0);

  const [snap, setSnap] = useState<PoolMatchLiveSnapshot | null>(initialSnapshot);
  const [err, setErr] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const poll = useCallback(async () => {
    if (!slug || mutatingRef.current) return;
    const id = activeMatchIdRef.current;
    if (!id) return;

    const epochAtStart = pollEpochRef.current;
    const stillActive = () => activeMatchIdRef.current === id;

    try {
      const res = await fetch(`/api/t/${encodeURIComponent(slug)}/matches/${encodeURIComponent(id)}/live`, {
        credentials: "same-origin",
      });
      if (!stillActive() || epochAtStart !== pollEpochRef.current) return;

      if (!res.ok) {
        if (res.status === 404) {
          setSnap(null);
          setErr("This match is not available for live scoring (or teams are not set yet).");
        } else {
          setErr(`Could not load match (${res.status})`);
        }
        return;
      }
      const j = (await res.json()) as PoolMatchLiveSnapshot;
      if (!stillActive() || j.matchId !== id || epochAtStart !== pollEpochRef.current) return;
      setSnap(j);
      setErr(null);
    } catch {
      /* ignore transient network errors */
    }
  }, [slug]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && matchId) {
      if (!d.open) d.showModal();
      setSnap(initialSnapshot);
      setErr(null);
    } else {
      d.close();
    }
  }, [open, matchId, initialSnapshot]);

  const pollIntervalMs = snap?.isLive === true ? 750 : 2400;

  useEffect(() => {
    if (!open || !matchId) return;
    void poll();
    const t = window.setInterval(() => {
      if (mutatingRef.current) return;
      void poll();
    }, pollIntervalMs);
    return () => window.clearInterval(t);
  }, [open, matchId, poll, pollIntervalMs]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    d.addEventListener("cancel", onCancel);
    return () => d.removeEventListener("cancel", onCancel);
  }, [onClose]);

  if (!matchId) return null;

  /** Lock live controls while a server mutation is in flight (polls keep running in the background). */
  const locked = pendingKey !== null;

  async function submitAction(
    key: string,
    fn: (fd: FormData) => Promise<void>,
    e: FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();
    if (mutatingRef.current) return;
    mutatingRef.current = true;
    setPendingKey(key);
    setErr(null);
    try {
      await fn(new FormData(e.currentTarget));
      pollEpochRef.current += 1;
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Something went wrong");
    } finally {
      mutatingRef.current = false;
      setPendingKey(null);
    }
    void (async () => {
      try {
        await poll();
        startTransition(() => {
          router.refresh();
        });
      } catch {
        /* poll already ignores errors */
      }
    })();
  }

  const s = snap;
  const proposedName =
    s && s.proposedWinnerTeamId === s.teamAId
      ? s.teamAName
      : s && s.proposedWinnerTeamId === s.teamBId
        ? s.teamBName
        : null;

  const winnerName =
    s && s.winnerTeamId === s.teamAId
      ? s.teamAName
      : s && s.winnerTeamId === s.teamBId
        ? s.teamBName
        : null;

  return (
    <dialog
      ref={dialogRef}
      className={`fixed left-1/2 top-1/2 z-50 m-0 max-h-[min(92vh,800px)] w-[min(calc(100vw-1rem),52rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border p-0 shadow-xl backdrop:bg-black/60 ${surface(appearance)}`}
      aria-labelledby="pool-live-title"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[min(92vh,800px)] flex-col">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <p className={`text-xs font-semibold uppercase tracking-wide ${mutedCls(appearance)}`}>
              Pool · live scoring
            </p>
            <h2 id="pool-live-title" className="mt-0.5 text-lg font-semibold">
              {s ? `${s.teamAName} vs ${s.teamBName}` : "Loading…"}
            </h2>
            {s?.winnerTeamId ? (
              <p className={`mt-1 text-sm ${mutedCls(appearance)}`}>Final result</p>
            ) : s ? (
              <p className={`mt-1 text-sm tabular-nums ${mutedCls(appearance)}`}>
                Race to {s.raceTo} sunk balls
                {s.isLive ? (
                  <span className="ml-2 rounded bg-red-500/15 px-1.5 py-0.5 text-xs font-semibold text-red-400">
                    LIVE
                  </span>
                ) : null}
              </p>
            ) : null}
            {s && s.teamAId && s.teamBId ? (
              <div className="mt-3 max-w-md">
                <PoolMatchRaceScoreboard
                  teamAName={s.teamAName}
                  teamBName={s.teamBName}
                  teamASunk={s.teamASunk}
                  teamBSunk={s.teamBSunk}
                  raceTo={s.raceTo}
                  appearance={appearance}
                />
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {canRecord && s && !s.winnerTeamId ? (
              <form
                onSubmit={(e) => submitAction("live", setPoolMatchLiveAction, e)}
                className="flex items-center gap-2"
              >
                <input type="hidden" name="matchId" value={matchId} />
                <input type="hidden" name="tournamentId" value={tournamentId} />
                <input type="hidden" name="isLive" value={s.isLive ? "false" : "true"} />
                <button
                  type="submit"
                  disabled={locked || Boolean(s.proposedWinnerTeamId)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted/30 disabled:opacity-50"
                >
                  {pendingKey === "live" ? <PendingSpinner /> : null}
                  {s.isLive ? "End live" : "Start live"}
                </button>
              </form>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-2 py-1 text-sm text-muted hover:bg-muted/40 hover:text-foreground"
            >
              Close
            </button>
          </div>
        </div>

        {err ? (
          <p className="shrink-0 border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300" role="alert">
            {err}
          </p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {!s ? (
            <p className={mutedCls(appearance)}>Loading match…</p>
          ) : s.winnerTeamId && winnerName ? (
            <>
              <p className="text-center text-base font-semibold">
                Winner: <span className="text-emerald-500">{winnerName}</span>
              </p>
              <div className="mt-6">{statGrid(s, appearance, false, matchId, tournamentId, locked, pendingKey, submitAction)}</div>
            </>
          ) : (
            <>
              {s.proposedWinnerTeamId && proposedName ? (
                <div
                  className={`mb-6 rounded-lg border px-4 py-3 ${
                    appearance === "light"
                      ? "border-amber-300 bg-amber-50 text-amber-950"
                      : "border-amber-500/40 bg-amber-950/30 text-amber-100"
                  }`}
                >
                  <p className="text-center text-base font-semibold">{proposedName} wins</p>
                  {canRecord ? (
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      <form onSubmit={(e) => submitAction("confirm", confirmPoolWinProposalAction, e)}>
                        <input type="hidden" name="matchId" value={matchId} />
                        <input type="hidden" name="tournamentId" value={tournamentId} />
                        <button
                          type="submit"
                          disabled={locked}
                          className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {pendingKey === "confirm" ? <PendingSpinner /> : null}
                          Confirm result
                        </button>
                      </form>
                      <form onSubmit={(e) => submitAction("undo-proposal", undoLastPoolStatAction, e)}>
                        <input type="hidden" name="matchId" value={matchId} />
                        <input type="hidden" name="tournamentId" value={tournamentId} />
                        <button
                          type="submit"
                          disabled={locked}
                          className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-muted/30 disabled:opacity-50"
                        >
                          {pendingKey === "undo-proposal" ? <PendingSpinner /> : null}
                          Undo (remove last event)
                        </button>
                      </form>
                    </div>
                  ) : (
                    <p className={`mt-2 text-center text-sm ${mutedCls(appearance)}`}>
                      Awaiting official confirmation…
                    </p>
                  )}
                </div>
              ) : null}

              {statGrid(s, appearance, canRecord, matchId, tournamentId, locked, pendingKey, submitAction)}

              {canRecord && !s.winnerTeamId && !s.proposedWinnerTeamId ? (
                <form
                  onSubmit={(e) => submitAction("undo-last", undoLastPoolStatAction, e)}
                  className="mt-6 flex justify-center"
                >
                  <input type="hidden" name="matchId" value={matchId} />
                  <input type="hidden" name="tournamentId" value={tournamentId} />
                  <button
                    type="submit"
                    disabled={locked || s.eventsVersion === 0 || !s.isLive}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-muted/30 disabled:opacity-40"
                  >
                    {pendingKey === "undo-last" ? <PendingSpinner /> : null}
                    Undo last action
                  </button>
                </form>
              ) : null}
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
