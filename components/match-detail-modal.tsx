"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { PlayerAvatar } from "@/components/player-avatar";
import type { BracketMatch } from "@/components/bracket-view";
import type { PublicAppearance } from "@/lib/tournament-theme";

function isRealPlayerId(id: string): boolean {
  return !id.startsWith("empty-") && !id.startsWith("w-");
}

export function MatchDetailModal({
  match,
  open,
  onClose,
  appearance,
}: {
  match: BracketMatch | null;
  open: boolean;
  onClose: () => void;
  appearance: PublicAppearance;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && match) {
      if (!d.open) d.showModal();
    } else {
      d.close();
    }
  }, [open, match]);

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

  if (!match) return null;

  const surface =
    appearance === "light"
      ? "bg-white text-zinc-900 border-zinc-200"
      : appearance === "neon"
        ? "bg-card text-foreground border-cyan-500/25"
        : "bg-card text-foreground border-border";

  const muted =
    appearance === "light" ? "text-zinc-600" : "text-muted";

  const sideTitle =
    appearance === "light" ? "text-zinc-900" : "text-foreground";

  return (
    <dialog
      ref={dialogRef}
      className={`fixed left-1/2 top-1/2 z-50 m-0 max-h-[min(90vh,720px)] w-[min(calc(100vw-2rem),48rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border p-0 shadow-xl backdrop:bg-black/60 ${surface}`}
      aria-labelledby="match-detail-title"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[min(90vh,720px)] flex-col">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>
              {match.roundLabel}
            </p>
            <h2 id="match-detail-title" className="mt-0.5 text-lg font-semibold">
              Match detail
            </h2>
            <p className={`text-sm ${muted}`}>
              {match.teamA?.name ?? "—"} vs {match.teamB?.name ?? "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-2 py-1 text-sm text-muted hover:bg-muted/40 hover:text-foreground"
          >
            Close
          </button>
        </div>
        <div className="grid min-h-0 flex-1 overflow-y-auto sm:grid-cols-2">
          {[match.teamA, match.teamB].map((team, idx) => (
            <div
              key={team?.id ?? `col-${idx}`}
              className={`min-h-[200px] border-border p-4 sm:p-5 ${
                idx === 0 ? "border-b sm:border-b-0 sm:border-r" : ""
              }`}
            >
              <h3
                className={`text-center text-sm font-semibold sm:text-left ${sideTitle}`}
              >
                {team?.name ?? "—"}
              </h3>
              <ul className="mt-4 space-y-4">
                {(team?.players ?? []).map((p) => {
                  const real = isRealPlayerId(p.id);
                  return (
                    <li key={p.id}>
                      <div className="flex gap-3">
                        <div className="shrink-0 overflow-hidden rounded-full ring-1 ring-border">
                          <PlayerAvatar name={p.name} url={p.avatarUrl} size={48} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            {real ? (
                              <Link
                                href={`/players/${p.id}`}
                                className="font-medium text-accent hover:underline"
                              >
                                {p.name}
                              </Link>
                            ) : (
                              <span className="font-medium text-muted">{p.name}</span>
                            )}
                            <span className={`text-xs tabular-nums ${muted}`}>
                              W {p.stats.won} · L {p.stats.lost}
                              {p.stats.played > 0
                                ? ` · ${p.stats.played} played`
                                : null}
                            </span>
                          </div>
                          {real && p.bio ? (
                            <p
                              className={`mt-1 whitespace-pre-wrap text-sm leading-snug ${muted}`}
                            >
                              {p.bio}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </dialog>
  );
}
