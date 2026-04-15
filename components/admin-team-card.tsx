"use client";

import { useState } from "react";
import { PlayerAvatar } from "@/components/player-avatar";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  deleteTeam,
  saveTeamRoster,
  setTeamSeed,
  updateTeamName,
} from "@/lib/actions/admin";

export type AdminTeamCardPlayer = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type AdminTeamCardProps = {
  team: {
    id: string;
    name: string;
    seedOrder: number | null;
    teamPlayers: Array<{ slotIndex: number; player: AdminTeamCardPlayer }>;
  };
  tournamentId: string;
  playersPerTeam: number;
  allPlayers: Array<{ id: string; name: string }>;
  rosterFormKey: string;
};

export function AdminTeamCard({
  team,
  tournamentId,
  playersPerTeam,
  allPlayers,
  rosterFormKey,
}: AdminTeamCardProps) {
  const [open, setOpen] = useState(false);

  const slots = Array.from({ length: playersPerTeam }, (_, i) => {
    const tp = team.teamPlayers.find((x) => x.slotIndex === i);
    return tp?.player ?? null;
  });

  const avatarSize = 32;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="px-3 py-2 sm:px-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full min-h-11 items-center gap-2 rounded-md text-left outline-none ring-accent focus-visible:ring-2 sm:gap-3"
          aria-expanded={open}
        >
          <span
            className={`inline-flex size-6 shrink-0 items-center justify-center rounded border border-border bg-background text-xs text-muted transition-transform ${open ? "rotate-90" : ""}`}
            aria-hidden
          >
            ›
          </span>
          <span className="shrink-0 text-sm font-semibold text-foreground sm:text-base">{team.name}</span>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-3 overflow-x-auto pl-1 sm:gap-4 sm:pl-2">
            {slots.map((player, i) =>
              player ? (
                <div key={player.id} className="flex shrink-0 items-center gap-1.5">
                  <div className="shrink-0 overflow-hidden rounded-full ring-1 ring-border">
                    <PlayerAvatar name={player.name} url={player.avatarUrl} size={avatarSize} />
                  </div>
                  <span className="max-w-[140px] truncate text-xs text-foreground sm:max-w-none sm:text-sm">
                    {player.name}
                  </span>
                </div>
              ) : (
                <div
                  key={`empty-${i}`}
                  className="flex shrink-0 items-center gap-1.5 text-xs text-muted sm:text-sm"
                >
                  <div
                    className="shrink-0 rounded-full border border-dashed border-border bg-background/50"
                    style={{ width: avatarSize, height: avatarSize }}
                  />
                  <span className="whitespace-nowrap">—</span>
                </div>
              ),
            )}
          </div>
          <span className="shrink-0 text-xs text-muted sm:text-[13px]">
            {open ? "Close" : "Edit"}
          </span>
        </button>
      </div>

      {open ? (
        <div className="space-y-4 border-t border-border bg-card/40 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <form action={updateTeamName} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={team.id} />
              <input type="hidden" name="tournamentId" value={tournamentId} />
              <input
                name="name"
                defaultValue={team.name}
                className="rounded-md border border-border bg-background px-2 py-1 text-sm font-medium"
              />
              <PendingSubmitButton className="text-xs text-accent underline">Save name</PendingSubmitButton>
            </form>
            <form action={setTeamSeed} className="flex items-center gap-2 text-sm">
              <input type="hidden" name="id" value={team.id} />
              <input type="hidden" name="tournamentId" value={tournamentId} />
              <label>
                Seed{" "}
                <input
                  name="seedOrder"
                  type="number"
                  min={1}
                  defaultValue={team.seedOrder ?? ""}
                  placeholder="—"
                  className="w-16 rounded border border-border bg-background px-1 py-0.5"
                />
              </label>
              <PendingSubmitButton className="text-xs text-accent underline">Set seed</PendingSubmitButton>
            </form>
            <form action={deleteTeam}>
              <input type="hidden" name="id" value={team.id} />
              <input type="hidden" name="tournamentId" value={tournamentId} />
              <PendingSubmitButton className="text-xs text-red-400 hover:underline">
                Remove team
              </PendingSubmitButton>
            </form>
          </div>
          <form key={rosterFormKey} action={saveTeamRoster} className="space-y-4">
            <input type="hidden" name="teamId" value={team.id} />
            <input type="hidden" name="tournamentId" value={tournamentId} />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: playersPerTeam }, (_, slotIndex) => {
                const tp = team.teamPlayers.find((x) => x.slotIndex === slotIndex);
                const selectedId = tp?.player.id ?? "";
                return (
                  <label key={slotIndex} className="block text-sm">
                    <span className="text-muted">Player {slotIndex + 1}</span>
                    <select
                      name={`slot_${slotIndex}`}
                      defaultValue={selectedId}
                      className="mt-1 block w-full max-w-full rounded-md border border-border bg-background px-2 py-1"
                    >
                      <option value="">—</option>
                      {allPlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
            <PendingSubmitButton className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:border-accent">
              Save roster
            </PendingSubmitButton>
          </form>
        </div>
      ) : null}
    </div>
  );
}
