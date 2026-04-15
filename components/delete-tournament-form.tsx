"use client";

import { PendingSubmitButton } from "@/components/pending-submit-button";
import { deleteTournament } from "@/lib/actions/admin";

export function DeleteTournamentForm({
  tournamentId,
  tournamentName,
}: {
  tournamentId: string;
  tournamentName: string;
}) {
  return (
    <form
      action={deleteTournament}
      className="mt-8 border-t border-border pt-6"
      onSubmit={(e) => {
        if (
          !confirm(
            `Delete “${tournamentName}” and all its teams, matches, and bracket data? This cannot be undone.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={tournamentId} />
      <p className="text-sm text-muted">Danger zone</p>
      <PendingSubmitButton className="mt-2 rounded-md border border-red-900/60 bg-red-950/40 px-4 py-2 text-sm text-red-200 hover:bg-red-950/70">
        Delete tournament
      </PendingSubmitButton>
    </form>
  );
}
