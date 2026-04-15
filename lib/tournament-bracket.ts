import { TournamentStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildSlotsFromSeededTeams,
  countRounds,
  nextMatchPosition,
} from "@/lib/bracket";

type Tx = Omit<
  Prisma.TransactionClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

async function propagateWinnerTx(
  tx: Tx,
  tournamentId: string,
  fromMatchId: string,
  winnerTeamId: string,
) {
  const from = await tx.match.findUnique({ where: { id: fromMatchId } });
  if (!from) return;

  const maxRow = await tx.match.findFirst({
    where: { tournamentId },
    orderBy: { roundIndex: "desc" },
    select: { roundIndex: true },
  });
  const maxRound = maxRow?.roundIndex ?? 0;
  if (from.roundIndex >= maxRound) return;

  const nxt = nextMatchPosition(from.roundIndex, from.positionInRound);
  if (nxt.roundIndex > maxRound) return;

  const nextM = await tx.match.findUnique({
    where: {
      tournamentId_roundIndex_positionInRound: {
        tournamentId,
        roundIndex: nxt.roundIndex,
        positionInRound: nxt.positionInRound,
      },
    },
  });
  if (!nextM) return;

  const data =
    nxt.slot === "A" ? { teamAId: winnerTeamId } : { teamBId: winnerTeamId };

  await tx.match.update({
    where: { id: nextM.id },
    data,
  });

  const updated = await tx.match.findUnique({ where: { id: nextM.id } });
  if (!updated) return;

  let auto: string | null = null;
  if (updated.teamAId && !updated.teamBId) auto = updated.teamAId;
  if (!updated.teamAId && updated.teamBId) auto = updated.teamBId;
  if (auto) {
    await tx.match.update({
      where: { id: nextM.id },
      data: { winnerTeamId: auto },
    });
    await propagateWinnerTx(tx, tournamentId, nextM.id, auto);
  }
}

export async function generateBracket(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      teams: {
        include: { teamPlayers: true },
        orderBy: [{ seedOrder: "asc" }, { name: "asc" }],
      },
    },
  });
  if (!tournament) throw new Error("Tournament not found");
  const { playersPerTeam } = tournament;

  for (const team of tournament.teams) {
    if (team.teamPlayers.length !== playersPerTeam) {
      throw new Error(
        `Team "${team.name}" must have exactly ${playersPerTeam} player(s) assigned`,
      );
    }
  }

  if (tournament.teams.length < 2) {
    throw new Error("Need at least 2 teams to generate a bracket");
  }

  const teamIds = tournament.teams.map((t) => t.id);
  const slots = buildSlotsFromSeededTeams(teamIds);
  const P = slots.length;
  const numRounds = countRounds(P);

  await prisma.$transaction(
    async (tx) => {
      await tx.match.deleteMany({ where: { tournamentId } });

      for (let r = 0; r < numRounds; r++) {
        const matchCount = P / 2 ** (r + 1);
        for (let p = 0; p < matchCount; p++) {
          await tx.match.create({
            data: {
              tournamentId,
              roundIndex: r,
              positionInRound: p,
            },
          });
        }
      }

      for (let j = 0; j < P / 2; j++) {
        const a = slots[2 * j];
        const b = slots[2 * j + 1];
        const m = await tx.match.findUniqueOrThrow({
          where: {
            tournamentId_roundIndex_positionInRound: {
              tournamentId,
              roundIndex: 0,
              positionInRound: j,
            },
          },
        });
        let winnerId: string | null = null;
        if (a && !b) winnerId = a;
        if (!a && b) winnerId = b;

        await tx.match.update({
          where: { id: m.id },
          data: {
            teamAId: a ?? null,
            teamBId: b ?? null,
            winnerTeamId: winnerId,
          },
        });
        if (winnerId) {
          await propagateWinnerTx(tx, tournamentId, m.id, winnerId);
        }
      }

      await tx.tournament.update({
        where: { id: tournamentId },
        data: {
          status: TournamentStatus.BRACKET_READY,
        },
      });
    },
    { maxWait: 15_000, timeout: 30_000 },
  );
}

export async function setMatchWinner(matchId: string, winnerTeamId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { tournament: true },
  });
  if (!match) throw new Error("Match not found");
  if (match.winnerTeamId) {
    throw new Error("Match already has a winner");
  }
  if (winnerTeamId !== match.teamAId && winnerTeamId !== match.teamBId) {
    throw new Error("Winner must be one of the two teams");
  }
  if (!match.teamAId || !match.teamBId) {
    throw new Error("Both teams must be set before picking a winner");
  }

  const tournamentId = match.tournamentId;

  await prisma.$transaction(
    async (tx) => {
      await tx.match.update({
        where: { id: matchId },
        data: { winnerTeamId },
      });

      const maxRow = await tx.match.findFirst({
        where: { tournamentId },
        orderBy: { roundIndex: "desc" },
        select: { roundIndex: true },
      });
      const maxRound = maxRow?.roundIndex ?? 0;

      if (match.roundIndex >= maxRound) {
        await tx.tournament.update({
          where: { id: tournamentId },
          data: { status: TournamentStatus.COMPLETED },
        });
        return;
      }

      // Single hop only: put the winner into the next match. Do NOT auto-advance through
      // "bye" when the other slot is still waiting for another match — that was chaining
      // winners all the way to the final. Structural byes are handled in generateBracket only.
      const nxt = nextMatchPosition(match.roundIndex, match.positionInRound);
      const nextM = await tx.match.findUnique({
        where: {
          tournamentId_roundIndex_positionInRound: {
            tournamentId,
            roundIndex: nxt.roundIndex,
            positionInRound: nxt.positionInRound,
          },
        },
      });
      if (nextM) {
        await tx.match.update({
          where: { id: nextM.id },
          data:
            nxt.slot === "A"
              ? { teamAId: winnerTeamId }
              : { teamBId: winnerTeamId },
        });
      }

      await tx.tournament.update({
        where: { id: tournamentId },
        data: { status: TournamentStatus.IN_PROGRESS },
      });
    },
    { maxWait: 15_000, timeout: 30_000 },
  );
}

async function syncTournamentStatusTx(tx: Tx, tournamentId: string) {
  const maxRow = await tx.match.findFirst({
    where: { tournamentId },
    orderBy: { roundIndex: "desc" },
    select: { roundIndex: true },
  });
  const maxRound = maxRow?.roundIndex ?? 0;
  const final = await tx.match.findFirst({
    where: { tournamentId, roundIndex: maxRound },
  });
  if (final?.winnerTeamId) {
    await tx.tournament.update({
      where: { id: tournamentId },
      data: { status: TournamentStatus.COMPLETED },
    });
    return;
  }
  const prev = await tx.tournament.findUnique({
    where: { id: tournamentId },
    select: { status: true },
  });
  if (prev?.status === TournamentStatus.COMPLETED) {
    await tx.tournament.update({
      where: { id: tournamentId },
      data: { status: TournamentStatus.IN_PROGRESS },
    });
  }
}

/**
 * Clears this match's winner, removes the fed team from the next match, and repeats
 * downstream wherever a winner had propagated.
 */
async function clearMatchWinnerAndCascadeTx(tx: Tx, tournamentId: string, matchId: string) {
  const m = await tx.match.findUnique({ where: { id: matchId } });
  if (!m) return;

  await tx.match.update({
    where: { id: matchId },
    data: { winnerTeamId: null },
  });

  const maxRow = await tx.match.findFirst({
    where: { tournamentId },
    orderBy: { roundIndex: "desc" },
    select: { roundIndex: true },
  });
  const maxRound = maxRow?.roundIndex ?? 0;
  if (m.roundIndex >= maxRound) return;

  const nxt = nextMatchPosition(m.roundIndex, m.positionInRound);
  const nextM = await tx.match.findUnique({
    where: {
      tournamentId_roundIndex_positionInRound: {
        tournamentId,
        roundIndex: nxt.roundIndex,
        positionInRound: nxt.positionInRound,
      },
    },
  });
  if (!nextM) return;

  await tx.match.update({
    where: { id: nextM.id },
    data: nxt.slot === "A" ? { teamAId: null } : { teamBId: null },
  });

  const updated = await tx.match.findUnique({ where: { id: nextM.id } });
  if (updated?.winnerTeamId) {
    await clearMatchWinnerAndCascadeTx(tx, tournamentId, nextM.id);
  }
}

export async function resetMatchResult(matchId: string) {
  const m = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, tournamentId: true, winnerTeamId: true },
  });
  if (!m) throw new Error("Match not found");
  if (!m.winnerTeamId) {
    throw new Error("Match has no result to reset");
  }

  await prisma.$transaction(
    async (tx) => {
      await clearMatchWinnerAndCascadeTx(tx, m.tournamentId, matchId);
      await syncTournamentStatusTx(tx, m.tournamentId);
    },
    { maxWait: 15_000, timeout: 30_000 },
  );
}
