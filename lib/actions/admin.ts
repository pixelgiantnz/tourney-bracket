"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { PublicAppearance } from "@/lib/tournament-theme";
import { slugify } from "@/lib/slug";
import { deleteTournamentBlobAssets, uploadPublicImage } from "@/lib/uploads";
import { TournamentGameType } from "@prisma/client";
import { generateBracket, resetMatchResult, setMatchWinner } from "@/lib/tournament-bracket";

async function revalidateTournamentPublic(tournamentId: string) {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { slug: true },
  });
  revalidatePath("/");
  if (t?.slug) revalidatePath(`/t/${t.slug}`);
}

/**
 * Server Actions often receive uploads as `Blob` (or a `File` that fails `instanceof File`
 * across JS realms). Duck-type instead of `instanceof File` only.
 */
function getNonEmptyUploadBlob(entry: FormDataEntryValue | null): Blob | null {
  if (entry === null || typeof entry !== "object") return null;
  if (typeof (entry as Blob).arrayBuffer !== "function") return null;
  const { size } = entry as Blob;
  if (typeof size !== "number" || size <= 0) return null;
  return entry as Blob;
}

function blobMime(blob: Blob): string {
  if (blob instanceof File && blob.type) return blob.type;
  if (typeof blob.type === "string" && blob.type) return blob.type;
  return "image/jpeg";
}

export async function createPlayer(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name required");
  await prisma.player.create({ data: { name } });
  revalidatePath("/admin/players");
  revalidatePath("/players");
}

const MAX_PLAYER_BIO_LENGTH = 5000;

export async function updatePlayer(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const bioRaw = String(formData.get("bio") ?? "");
  const trimmed = bioRaw.trim();
  const bio =
    trimmed === ""
      ? null
      : trimmed.length > MAX_PLAYER_BIO_LENGTH
        ? trimmed.slice(0, MAX_PLAYER_BIO_LENGTH)
        : trimmed;
  if (!id || !name) throw new Error("Invalid");
  await prisma.player.update({ where: { id }, data: { name, bio } });
  revalidatePath("/admin/players");
  revalidatePath("/players");
  revalidatePath(`/players/${id}`);
}

export async function deletePlayer(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Invalid");
  await prisma.player.delete({ where: { id } });
  revalidatePath("/admin/players");
  revalidatePath("/players");
}

export async function uploadPlayerAvatar(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const blob = getNonEmptyUploadBlob(formData.get("avatar"));
  if (!id || !blob) {
    throw new Error("Avatar file required");
  }
  const buf = Buffer.from(await blob.arrayBuffer());
  const mime = blobMime(blob);
  const url = await uploadPublicImage(`players/${id}/avatar`, buf, mime);
  await prisma.player.update({ where: { id }, data: { avatarUrl: url } });
  revalidatePath("/admin/players");
  revalidatePath("/");
  revalidatePath("/players");
  revalidatePath(`/players/${id}`);
}

export async function removePlayerAvatar(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Invalid");
  await prisma.player.update({ where: { id }, data: { avatarUrl: null } });
  revalidatePath("/admin/players");
  revalidatePath("/");
  revalidatePath("/players");
  revalidatePath(`/players/${id}`);
}

export async function createTournament(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  let slug = String(formData.get("slug") ?? "").trim();
  const playersPerTeam = Math.max(
    1,
    parseInt(String(formData.get("playersPerTeam") ?? "2"), 10) || 2,
  );
  const gameTypeRaw = String(formData.get("gameType") ?? "DEFAULT");
  const gameType =
    gameTypeRaw === "POOL" ? TournamentGameType.POOL : TournamentGameType.DEFAULT;
  const poolRaceTo = Math.max(1, parseInt(String(formData.get("poolRaceTo") ?? "5"), 10) || 5);
  if (!name) throw new Error("Name required");
  if (!slug) slug = slugify(name);
  else slug = slugify(slug);
  try {
    await prisma.tournament.create({
      data: { name, slug, playersPerTeam, gameType, poolRaceTo },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("That URL slug is already in use");
    }
    throw e;
  }
  revalidatePath("/admin/tournaments");
  revalidatePath("/");
  revalidatePath(`/t/${slug}`);
}

export async function updateTournamentMeta(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  let slug = String(formData.get("slug") ?? "").trim();
  const gameTypeRaw = String(formData.get("gameType") ?? "DEFAULT");
  const gameType =
    gameTypeRaw === "POOL" ? TournamentGameType.POOL : TournamentGameType.DEFAULT;
  const poolRaceTo = Math.max(1, parseInt(String(formData.get("poolRaceTo") ?? "5"), 10) || 5);
  if (!id || !name) throw new Error("Invalid");
  const before = await prisma.tournament.findUnique({
    where: { id },
    select: { slug: true },
  });
  if (slug) slug = slugify(slug);

  // Only write `theme` when the browser actually submitted `publicAppearance`.
  // Controls inside a closed `<details>` are omitted from FormData in some browsers,
  // which used to force `appearance` to default "light" and wipe the saved theme on every save.
  let appearancePatch: { theme: { appearance: PublicAppearance } } | undefined;
  if (formData.has("publicAppearance")) {
    const rawAppearance = String(formData.get("publicAppearance") ?? "");
    const appearance: PublicAppearance =
      rawAppearance === "light" || rawAppearance === "dark" || rawAppearance === "neon"
        ? rawAppearance
        : "light";
    appearancePatch = { theme: { appearance } };
  }

  await prisma.tournament.update({
    where: { id },
    data: {
      name,
      ...(slug ? { slug } : {}),
      ...appearancePatch,
      gameType,
      poolRaceTo,
    },
  });
  revalidatePath("/admin/tournaments");
  revalidatePath(`/admin/tournaments/${id}`);
  revalidatePath("/");
  if (before?.slug && slug && before.slug !== slug) {
    revalidatePath(`/t/${before.slug}`);
  }
  await revalidateTournamentPublic(id);
}

export async function deleteTournament(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Invalid");
  const t = await prisma.tournament.findUnique({
    where: { id },
    select: { slug: true },
  });
  if (!t) {
    redirect("/admin/tournaments");
  }
  await prisma.tournament.delete({ where: { id } });
  try {
    await deleteTournamentBlobAssets(id);
  } catch (e) {
    console.error("deleteTournamentBlobAssets:", e);
  }
  revalidatePath("/admin/tournaments");
  revalidatePath("/");
  revalidatePath(`/t/${t.slug}`);
  redirect("/admin/tournaments");
}

export async function uploadTournamentAsset(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const blob = getNonEmptyUploadBlob(formData.get("file"));
  if (!id || !blob) {
    throw new Error("File required");
  }
  const buf = Buffer.from(await blob.arrayBuffer());
  const mime = blobMime(blob);
  const path =
    kind === "logo" ? `tournaments/${id}/logo` : `tournaments/${id}/trophy`;
  const url = await uploadPublicImage(path, buf, mime);
  await prisma.tournament.update({
    where: { id },
    data: kind === "logo" ? { logoUrl: url } : { trophyImageUrl: url },
  });
  revalidatePath(`/admin/tournaments/${id}`);
  await revalidateTournamentPublic(id);
}

export async function createTeam(formData: FormData) {
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!tournamentId || !name) throw new Error("Invalid");
  const max = await prisma.team.aggregate({
    where: { tournamentId },
    _max: { seedOrder: true },
  });
  const seedOrder = (max._max.seedOrder ?? 0) + 1;
  await prisma.team.create({
    data: { tournamentId, name, seedOrder },
  });
  revalidatePath(`/admin/tournaments/${tournamentId}`);
  await revalidateTournamentPublic(tournamentId);
}

export async function updateTeamName(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) throw new Error("Invalid");
  await prisma.team.update({ where: { id }, data: { name } });
  revalidatePath(`/admin/tournaments/${tournamentId}`);
  await revalidateTournamentPublic(tournamentId);
}

export async function setTeamSeed(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const seedOrder = parseInt(String(formData.get("seedOrder") ?? ""), 10);
  if (!id || Number.isNaN(seedOrder)) throw new Error("Invalid");
  await prisma.team.update({ where: { id }, data: { seedOrder } });
  revalidatePath(`/admin/tournaments/${tournamentId}`);
  await revalidateTournamentPublic(tournamentId);
}

const reorderTeamSeedsSchema = z.object({
  tournamentId: z.string().min(1),
  orderedTeamIds: z.array(z.string().min(1)).min(1),
});

export async function reorderTeamSeeds(tournamentId: string, orderedTeamIds: string[]) {
  const parsed = reorderTeamSeedsSchema.safeParse({ tournamentId, orderedTeamIds });
  if (!parsed.success) throw new Error("Invalid");

  const existing = await prisma.team.findMany({
    where: { tournamentId: parsed.data.tournamentId },
    select: { id: true },
  });
  const expected = new Set(existing.map((t) => t.id));
  if (parsed.data.orderedTeamIds.length !== expected.size) throw new Error("Invalid");
  if (new Set(parsed.data.orderedTeamIds).size !== parsed.data.orderedTeamIds.length) {
    throw new Error("Invalid");
  }
  for (const id of parsed.data.orderedTeamIds) {
    if (!expected.has(id)) throw new Error("Invalid");
  }

  await prisma.$transaction(
    parsed.data.orderedTeamIds.map((id, index) =>
      prisma.team.update({
        where: { id },
        data: { seedOrder: index + 1 },
      }),
    ),
  );

  revalidatePath(`/admin/tournaments/${tournamentId}`);
  await revalidateTournamentPublic(tournamentId);
}

export async function deleteTeam(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const tournamentId = String(formData.get("tournamentId") ?? "");
  if (!id) throw new Error("Invalid");
  await prisma.team.delete({ where: { id } });
  revalidatePath(`/admin/tournaments/${tournamentId}`);
  await revalidateTournamentPublic(tournamentId);
}

/** Save all roster slots for a team in one submit. */
export async function saveTeamRoster(formData: FormData) {
  const teamId = String(formData.get("teamId") ?? "");
  const tournamentId = String(formData.get("tournamentId") ?? "");
  if (!teamId || !tournamentId) throw new Error("Invalid");

  const team = await prisma.team.findUniqueOrThrow({
    where: { id: teamId },
    include: { tournament: true },
  });
  if (team.tournamentId !== tournamentId) throw new Error("Invalid");

  const ppt = team.tournament.playersPerTeam;
  const slots: string[] = [];
  for (let i = 0; i < ppt; i++) {
    const v = formData.get(`slot_${i}`);
    slots.push(typeof v === "string" ? v.trim() : "");
  }

  const filled = slots.filter(Boolean);
  if (new Set(filled).size !== filled.length) {
    throw new Error("The same player cannot be in two slots on this team");
  }

  for (const playerId of filled) {
    const conflict = await prisma.teamPlayer.findFirst({
      where: {
        playerId,
        team: { tournamentId },
        teamId: { not: teamId },
      },
    });
    if (conflict) {
      throw new Error("A selected player is already on another team in this tournament");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.teamPlayer.deleteMany({ where: { teamId } });
    for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
      const playerId = slots[slotIndex];
      if (!playerId) continue;
      await tx.teamPlayer.create({
        data: { teamId, playerId, slotIndex },
      });
    }
  });

  revalidatePath(`/admin/tournaments/${tournamentId}`);
  await revalidateTournamentPublic(tournamentId);
}

export async function generateBracketAction(formData: FormData) {
  const tournamentId = String(formData.get("tournamentId") ?? "");
  if (!tournamentId) throw new Error("Invalid");
  await generateBracket(tournamentId);
  revalidatePath(`/admin/tournaments/${tournamentId}`);
  await revalidateTournamentPublic(tournamentId);
}

export async function setMatchWinnerAction(formData: FormData) {
  const matchId = String(formData.get("matchId") ?? "");
  const winnerTeamId = String(formData.get("winnerTeamId") ?? "");
  const tournamentId = String(formData.get("tournamentId") ?? "");
  if (!matchId || !winnerTeamId) throw new Error("Invalid");
  await setMatchWinner(matchId, winnerTeamId);
  revalidatePath(`/admin/tournaments/${tournamentId}`);
  await revalidateTournamentPublic(tournamentId);
}

export async function resetMatchResultAction(formData: FormData) {
  const matchId = String(formData.get("matchId") ?? "");
  const tournamentId = String(formData.get("tournamentId") ?? "");
  if (!matchId || !tournamentId) throw new Error("Invalid");
  await resetMatchResult(matchId);
  revalidatePath(`/admin/tournaments/${tournamentId}`);
  await revalidateTournamentPublic(tournamentId);
}
