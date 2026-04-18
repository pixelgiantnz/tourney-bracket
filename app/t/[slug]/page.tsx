import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BracketView,
  type BracketMatch,
  type BracketPlayer,
  type BracketTeam,
} from "@/components/bracket-view";
import { bracketRoundLabel } from "@/lib/bracket-round-label";
import { emptyPlayerMatchStats, getStatsForPlayerIds } from "@/lib/player-stats";
import { prisma } from "@/lib/prisma";
import { parsePublicAppearance } from "@/lib/tournament-theme";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = await prisma.tournament.findUnique({
    where: { slug },
    select: { name: true },
  });
  return { title: t?.name ?? "Tournament" };
}

type TeamWithPlayers = {
  id: string;
  name: string;
  teamPlayers: Array<{
    slotIndex: number;
    player: { id: string; name: string; avatarUrl: string | null; bio: string | null };
  }>;
};

function bracketPlayersFromTeam(
  t: TeamWithPlayers,
  playersPerTeam: number,
  statsMap: Awaited<ReturnType<typeof getStatsForPlayerIds>>,
): BracketPlayer[] {
  const sorted = [...t.teamPlayers].sort((a, b) => a.slotIndex - b.slotIndex);
  const players: BracketPlayer[] = [];
  for (let i = 0; i < playersPerTeam; i++) {
    const tp = sorted.find((x) => x.slotIndex === i);
    if (tp) {
      players.push({
        id: tp.player.id,
        name: tp.player.name,
        avatarUrl: tp.player.avatarUrl,
        bio: tp.player.bio,
        stats: statsMap.get(tp.player.id) ?? emptyPlayerMatchStats,
      });
    } else {
      players.push({
        id: `empty-${t.id}-${i}`,
        name: "?",
        avatarUrl: null,
        bio: null,
        stats: emptyPlayerMatchStats,
      });
    }
  }
  return players;
}

function toBracketTeam(
  t: TeamWithPlayers | null,
  playersPerTeam: number,
  statsMap: Awaited<ReturnType<typeof getStatsForPlayerIds>>,
): BracketTeam | null {
  if (!t) return null;
  return {
    id: t.id,
    name: t.name,
    players: bracketPlayersFromTeam(t, playersPerTeam, statsMap),
  };
}

function collectPlayerIds(tournament: {
  matches: Array<{
    teamA: TeamWithPlayers | null;
    teamB: TeamWithPlayers | null;
    winner: TeamWithPlayers | null;
  }>;
}): string[] {
  const ids = new Set<string>();
  for (const m of tournament.matches) {
    for (const side of [m.teamA, m.teamB, m.winner]) {
      if (!side) continue;
      for (const tp of side.teamPlayers) {
        ids.add(tp.player.id);
      }
    }
  }
  return [...ids];
}

export default async function TournamentPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    include: {
      matches: {
        orderBy: [{ roundIndex: "asc" }, { positionInRound: "asc" }],
        include: {
          teamA: {
            include: {
              teamPlayers: {
                include: { player: true },
                orderBy: { slotIndex: "asc" },
              },
            },
          },
          teamB: {
            include: {
              teamPlayers: {
                include: { player: true },
                orderBy: { slotIndex: "asc" },
              },
            },
          },
          winner: {
            include: {
              teamPlayers: {
                include: { player: true },
                orderBy: { slotIndex: "asc" },
              },
            },
          },
        },
      },
    },
  });

  if (!tournament) notFound();

  const statsMap = await getStatsForPlayerIds(collectPlayerIds(tournament));

  const appearance = parsePublicAppearance(tournament.theme);
  const ppt = tournament.playersPerTeam;
  const maxRound = tournament.matches.length
    ? Math.max(...tournament.matches.map((x) => x.roundIndex))
    : 0;
  const matches: BracketMatch[] = tournament.matches.map((m) => ({
    id: m.id,
    roundIndex: m.roundIndex,
    positionInRound: m.positionInRound,
    roundLabel: bracketRoundLabel(m.roundIndex, maxRound),
    teamA: toBracketTeam(m.teamA, ppt, statsMap),
    teamB: toBracketTeam(m.teamB, ppt, statsMap),
    winner: m.winner
      ? {
          id: m.winner.id,
          name: m.winner.name,
          players: bracketPlayersFromTeam(m.winner, ppt, statsMap),
        }
      : null,
  }));

  return (
    <div
      className={
        appearance === "dark"
          ? "theme-dark min-h-screen w-full bg-background text-foreground"
          : appearance === "neon"
            ? "theme-neon min-h-screen w-full text-foreground"
            : "min-h-screen w-full bg-background text-foreground"
      }
    >
      <div className="mx-auto w-full max-w-none px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <BracketView
          appearance={appearance}
          tournament={{
            name: tournament.name,
            logoUrl: tournament.logoUrl,
            trophyImageUrl: tournament.trophyImageUrl,
            playersPerTeam: tournament.playersPerTeam,
          }}
          matches={matches}
        />
      </div>
    </div>
  );
}
