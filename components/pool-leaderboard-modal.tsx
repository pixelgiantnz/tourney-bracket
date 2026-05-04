"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PlayerAvatar } from "@/components/player-avatar";
import type { PoolLeaderMetric } from "@/lib/pool-leaderboard";
import type { PublicAppearance } from "@/lib/tournament-theme";

type Row = { playerId: string; name: string; avatarUrl: string | null; value: number };

function surface(appearance: PublicAppearance) {
  return appearance === "light"
    ? "bg-white text-zinc-900 border-zinc-200"
    : appearance === "neon"
      ? "bg-card text-foreground border-cyan-500/25"
      : "bg-card text-foreground border-border";
}

const METRIC_LABEL: Record<PoolLeaderMetric, string> = {
  made: "Shots made (sunk)",
  missed: "Shots missed",
  foul: "Fouls",
  matches_won: "Matches won (bracket)",
};

export function PoolLeaderboardModal({
  open,
  onClose,
  appearance,
  slug,
}: {
  open: boolean;
  onClose: () => void;
  appearance: PublicAppearance;
  slug: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [metric, setMetric] = useState<PoolLeaderMetric>("made");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open) {
      if (!d.open) d.showModal();
    } else {
      d.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/t/${encodeURIComponent(slug)}/leaderboard?metric=${encodeURIComponent(metric)}`,
          { credentials: "same-origin" },
        );
        if (!res.ok) {
          if (!cancelled) setRows([]);
          return;
        }
        const j = (await res.json()) as { rows: Row[] };
        if (!cancelled) setRows(j.rows ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, slug, metric]);

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

  return (
    <dialog
      ref={dialogRef}
      className={`fixed left-1/2 top-1/2 z-50 m-0 max-h-[min(85vh,640px)] w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border p-0 shadow-xl backdrop:bg-black/60 ${surface(appearance)}`}
      aria-labelledby="lb-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[min(85vh,640px)] flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 id="lb-title" className="text-lg font-semibold">
            Top 10
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-2 py-1 text-sm text-muted hover:bg-muted/40"
          >
            Close
          </button>
        </div>
        <div className="border-b border-border px-4 py-2">
          <label className="block text-xs font-medium uppercase tracking-wide text-muted">
            Metric
            <select
              value={metric}
              disabled={loading}
              onChange={(e) => setMetric(e.target.value as PoolLeaderMetric)}
              className="mt-1 block w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {(Object.keys(METRIC_LABEL) as PoolLeaderMetric[]).map((k) => (
                <option key={k} value={k}>
                  {METRIC_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted">No data yet for this tournament.</p>
          ) : (
            <ol className="space-y-2">
              {rows.map((r, i) => (
                <li
                  key={r.playerId}
                  className="flex items-center gap-3 rounded-md border border-border/50 px-2 py-2"
                >
                  <span className="w-6 text-center text-xs font-bold text-muted">{i + 1}</span>
                  <Link
                    href={`/players/${r.playerId}`}
                    className="flex min-w-0 flex-1 items-center gap-2 hover:text-accent"
                  >
                    <span className="shrink-0 overflow-hidden rounded-full ring-1 ring-border">
                      <PlayerAvatar name={r.name} url={r.avatarUrl} size={32} />
                    </span>
                    <span className="min-w-0 truncate font-medium">{r.name}</span>
                  </Link>
                  <span className="shrink-0 tabular-nums text-sm font-semibold">{r.value}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </dialog>
  );
}
