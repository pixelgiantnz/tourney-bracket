import Link from "next/link";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { prisma } from "@/lib/prisma";
import {
  createPlayer,
  deletePlayer,
  removePlayerAvatar,
  updatePlayer,
  uploadPlayerAvatar,
} from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const players = await prisma.player.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Players</h1>
      <p className="mt-1 text-sm text-muted">
        Global list. Assign players to teams inside each tournament.
      </p>

      <form action={createPlayer} className="mt-8 flex flex-wrap gap-2">
        <input
          name="name"
          placeholder="New player name"
          required
          className="min-w-[200px] flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <PendingSubmitButton className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          Add player
        </PendingSubmitButton>
      </form>

      <ul className="mt-10 space-y-6">
        {players.map((p) => (
          <li
            key={p.id}
            className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-start"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex items-start gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-border">
                  {p.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <form action={updatePlayer} className="flex min-w-0 flex-1 flex-col gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <input
                    name="name"
                    defaultValue={p.name}
                    className="max-w-md rounded-md border border-border bg-background px-2 py-1 text-sm"
                  />
                  <label className="text-xs text-muted">
                    Public bio (optional, shown on player profile & match details)
                    <textarea
                      name="bio"
                      rows={3}
                      defaultValue={p.bio ?? ""}
                      className="mt-1 block w-full max-w-lg rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <PendingSubmitButton className="w-fit rounded-md border border-border px-3 py-1.5 text-sm">
                      Save profile
                    </PendingSubmitButton>
                    <Link
                      href={`/players/${p.id}`}
                      className="text-sm text-accent underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      View public profile
                    </Link>
                  </div>
                </form>
              </div>
            </div>
            <div className="flex flex-1 flex-wrap items-center gap-4 sm:justify-end">
              <form action={uploadPlayerAvatar} className="flex items-center gap-2">
                <input type="hidden" name="id" value={p.id} />
                <input
                  name="avatar"
                  type="file"
                  accept="image/png,image/jpeg"
                  required
                  className="max-w-[200px] text-xs"
                />
                <PendingSubmitButton className="rounded border border-border px-2 py-1 text-xs">
                  Upload avatar
                </PendingSubmitButton>
              </form>
              {p.avatarUrl ? (
                <form action={removePlayerAvatar}>
                  <input type="hidden" name="id" value={p.id} />
                  <PendingSubmitButton className="text-xs text-muted underline decoration-border hover:text-foreground">
                    Remove avatar
                  </PendingSubmitButton>
                </form>
              ) : null}
              <form action={deletePlayer}>
                <input type="hidden" name="id" value={p.id} />
                <PendingSubmitButton className="text-xs text-red-400 hover:underline">
                  Delete
                </PendingSubmitButton>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
