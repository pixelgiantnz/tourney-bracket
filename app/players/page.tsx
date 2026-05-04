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

const SORTS: PlayerListSort[] = [
  "name",
  "played",
  "won",
  "lost",
  "poolPlayed",
  "poolWon",
  "poolLost",
  "poolMade",
  "poolMissed",
  "poolFoul",
];

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
      return "All Pl";
    case "won":
      return "All W";
    case "lost":
      return "All L";
    case "poolPlayed":
      return "Pool Pl";
    case "poolWon":
      return "Pool W";
    case "poolLost":
      return "Pool L";
    case "poolMade":
      return "Sunk";
    case "poolMissed":
      return "Miss";
    case "poolFoul":
      return "Foul";
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Players</h1>
      <p className="mt-1 text-sm text-muted">
        <strong>All tournaments</strong> — bracket W/L from every event.{" "}
        <strong>Pool</strong> — bracket W/L and live stats only from pool (billiards) tournaments.
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
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="sticky left-0 z-10 bg-muted/30 px-3 py-2 font-medium">
                <Link href={buildSortHref("name")} className="text-accent hover:underline">
                  {sortLinkLabel("name")}
                  {indicator("name")}
                </Link>
              </th>
              <th
                colSpan={3}
                className="border-l border-border/60 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted"
              >
                All tournaments
              </th>
              <th
                colSpan={6}
                className="border-l border-border/60 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted"
              >
                Pool only
              </th>
            </tr>
            <tr className="border-b border-border/80">
              <th className="sticky left-0 z-10 bg-muted/30" />
              <th className="border-l border-border/60 px-2 py-1.5 text-right font-medium">
                <Link href={buildSortHref("played")} className="text-accent hover:underline">
                  {sortLinkLabel("played")}
                  {indicator("played")}
                </Link>
              </th>
              <th className="px-2 py-1.5 text-right font-medium">
                <Link href={buildSortHref("won")} className="text-accent hover:underline">
                  {sortLinkLabel("won")}
                  {indicator("won")}
                </Link>
              </th>
              <th className="px-2 py-1.5 text-right font-medium">
                <Link href={buildSortHref("lost")} className="text-accent hover:underline">
                  {sortLinkLabel("lost")}
                  {indicator("lost")}
                </Link>
              </th>
              <th className="border-l border-border/60 px-2 py-1.5 text-right font-medium">
                <Link href={buildSortHref("poolPlayed")} className="text-accent hover:underline">
                  {sortLinkLabel("poolPlayed")}
                  {indicator("poolPlayed")}
                </Link>
              </th>
              <th className="px-2 py-1.5 text-right font-medium">
                <Link href={buildSortHref("poolWon")} className="text-accent hover:underline">
                  {sortLinkLabel("poolWon")}
                  {indicator("poolWon")}
                </Link>
              </th>
              <th className="px-2 py-1.5 text-right font-medium">
                <Link href={buildSortHref("poolLost")} className="text-accent hover:underline">
                  {sortLinkLabel("poolLost")}
                  {indicator("poolLost")}
                </Link>
              </th>
              <th className="px-2 py-1.5 text-right font-medium">
                <Link href={buildSortHref("poolMade")} className="text-accent hover:underline">
                  {sortLinkLabel("poolMade")}
                  {indicator("poolMade")}
                </Link>
              </th>
              <th className="px-2 py-1.5 text-right font-medium">
                <Link href={buildSortHref("poolMissed")} className="text-accent hover:underline">
                  {sortLinkLabel("poolMissed")}
                  {indicator("poolMissed")}
                </Link>
              </th>
              <th className="px-2 py-1.5 text-right font-medium">
                <Link href={buildSortHref("poolFoul")} className="text-accent hover:underline">
                  {sortLinkLabel("poolFoul")}
                  {indicator("poolFoul")}
                </Link>
              </th>
            </tr>
          </thead>
          <tbody>
            {players.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-muted">
                  No players match your search.
                </td>
              </tr>
            ) : (
              players.map((p) => (
                <tr key={p.id} className="border-b border-border/60 last:border-0">
                  <td className="sticky left-0 z-10 bg-background px-3 py-2">
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
                  <td className="border-l border-border/40 px-2 py-2 text-right tabular-nums text-muted">
                    {p.stats.played}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-muted">{p.stats.won}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-muted">{p.stats.lost}</td>
                  <td className="border-l border-border/40 px-2 py-2 text-right tabular-nums text-muted">
                    {p.poolStats.played}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-muted">{p.poolStats.won}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-muted">{p.poolStats.lost}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-muted">{p.poolStats.made}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-muted">{p.poolStats.missed}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-muted">{p.poolStats.foul}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
