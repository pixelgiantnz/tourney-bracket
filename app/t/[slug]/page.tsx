import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  BracketView,
  type BracketMatch,
  type BracketPlayer,
  type BracketTeam,
} from "@/components/bracket-view";

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

function toBracketTeam(
  t: {
    id: string;
    name: string;
    teamPlayers: {
      slotIndex: number;
      player: { id: string; name: string; avatarUrl: string | null };
    }[];
  } | null,
  playersPerTeam: number,
): BracketTeam | null {
  if (!t) return null;
  const sorted = [...t.teamPlayers].sort((a, b) => a.slotIndex - b.slotIndex);
  const players: BracketPlayer[] = [];
  for (let i = 0; i < playersPerTeam; i++) {
    const tp = sorted.find((x) => x.slotIndex === i);
    if (tp) {
      players.push({
        id: tp.player.id,
        name: tp.player.name,
        avatarUrl: tp.player.avatarUrl,
      });
    } else {
      players.push({
        id: `empty-${t.id}-${i}`,
        name: "?",
        avatarUrl: null,
      });
    }
  }
  return {
    id: t.id,
    name: t.name,
    players,
  };
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
          teamA: { include: { teamPlayers: { include: { player: true } } } },
          teamB: { include: { teamPlayers: { include: { player: true } } } },
          winner: { include: { teamPlayers: { include: { player: true } } } },
        },
      },
    },
  });

  if (!tournament) notFound();

  const ppt = tournament.playersPerTeam;
  const matches: BracketMatch[] = tournament.matches.map((m) => ({
    id: m.id,
    roundIndex: m.roundIndex,
    positionInRound: m.positionInRound,
    teamA: toBracketTeam(m.teamA, ppt),
    teamB: toBracketTeam(m.teamB, ppt),
    winner: m.winner
      ? {
          id: m.winner.id,
          name: m.winner.name,
          players: (() => {
            const sorted = [...m.winner.teamPlayers].sort((a, b) => a.slotIndex - b.slotIndex);
            const out: BracketPlayer[] = [];
            for (let i = 0; i < ppt; i++) {
              const tp = sorted.find((x) => x.slotIndex === i);
              if (tp) {
                out.push({
                  id: tp.player.id,
                  name: tp.player.name,
                  avatarUrl: tp.player.avatarUrl,
                });
              } else {
                out.push({ id: `w-${i}`, name: "?", avatarUrl: null });
              }
            }
            return out;
          })(),
        }
      : null,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <BracketView
        tournament={{
          name: tournament.name,
          logoUrl: tournament.logoUrl,
          trophyImageUrl: tournament.trophyImageUrl,
          playersPerTeam: tournament.playersPerTeam,
        }}
        matches={matches}
      />
    </div>
  );
}
