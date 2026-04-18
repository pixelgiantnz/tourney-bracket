import Link from "next/link";
import type { Metadata } from "next";
import { PlayerAvatar } from "@/components/player-avatar";
import {
  getPlayersForListing,
  type PlayerListSort,
  type SortOrder,
} from "@/lib/player-stats";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Players",
  description: "Player directory and match statistics",
};

const SORTS: PlayerListSort[] = ["name", "played", "won", "lost"];

function parseSort(v: string | undefined): PlayerListSort {
  return SORTS.includes(v as PlayerListSort) ? (v as PlayerListSort) : "name";
}

function parseOrder(v: string | undefined): SortOrder {
  return v === "desc" ? "desc" : "asc";
}

function sortLinkLabel(sort: PlayerListSort): string {
  switch (sort) {
    case "name":
      return "Name";
    case "played":
      return "Played";
    case "won":
      return "Won";
    case "lost":
      return "Lost";
    default:
      return sort;
  }
}

export default async function PlayersDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; order?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const sort = parseSort(sp.sort);
  const order = parseOrder(sp.order);

  const players = await getPlayersForListing({ q: q || undefined, sort, order });

  const buildSortHref = (nextSort: PlayerListSort) => {
    const nextOrder: SortOrder =
      sort === nextSort ? (order === "asc" ? "desc" : "asc") : nextSort === "name" ? "asc" : "desc";
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("sort", nextSort);
    params.set("order", nextOrder);
    return `/players?${params.toString()}`;
  };

  const indicator = (col: PlayerListSort) => {
    if (sort !== col) return "";
    return order === "asc" ? " ↑" : " ↓";
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Players</h1>
      <p className="mt-1 text-sm text-muted">
        Global stats from completed bracket matches across all tournaments.
      </p>

      <form method="get" className="mt-6 flex flex-wrap gap-2" role="search">
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="order" value={order} />
        <label className="sr-only" htmlFor="player-search">
          Search by name
        </label>
        <input
          id="player-search"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search by name…"
          className="min-w-[200px] flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium"
        >
          Search
        </button>
      </form>

      <div className="mt-8 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="px-3 py-2 font-medium">
                <Link
                  href={buildSortHref("name")}
                  className="text-accent hover:underline"
                >
                  {sortLinkLabel("name")}
                  {indicator("name")}
                </Link>
              </th>
              <th className="px-3 py-2 font-medium text-right">
                <Link
                  href={buildSortHref("played")}
                  className="text-accent hover:underline"
                >
                  {sortLinkLabel("played")}
                  {indicator("played")}
                </Link>
              </th>
              <th className="px-3 py-2 font-medium text-right">
                <Link
                  href={buildSortHref("won")}
                  className="text-accent hover:underline"
                >
                  {sortLinkLabel("won")}
                  {indicator("won")}
                </Link>
              </th>
              <th className="px-3 py-2 font-medium text-right">
                <Link
                  href={buildSortHref("lost")}
                  className="text-accent hover:underline"
                >
                  {sortLinkLabel("lost")}
                  {indicator("lost")}
                </Link>
              </th>
            </tr>
          </thead>
          <tbody>
            {players.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted">
                  No players match your search.
                </td>
              </tr>
            ) : (
              players.map((p) => (
                <tr key={p.id} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-2">
                    <Link
                      href={`/players/${p.id}`}
                      className="inline-flex items-center gap-2 font-medium text-foreground hover:text-accent"
                    >
                      <span className="overflow-hidden rounded-full ring-1 ring-border">
                        <PlayerAvatar name={p.name} url={p.avatarUrl} size={32} />
                      </span>
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted">
                    {p.stats.played}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted">
                    {p.stats.won}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted">
                    {p.stats.lost}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
