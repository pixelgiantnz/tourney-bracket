import { BlobNotFoundError, del, put } from "@vercel/blob";

export async function uploadPublicImage(
  pathname: string,
  data: Blob | ArrayBuffer | Buffer,
  contentType: string,
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  }
  const body =
    data instanceof Buffer
      ? data
      : data instanceof ArrayBuffer
        ? Buffer.from(data)
        : Buffer.from(await (data as Blob).arrayBuffer());

  const blob = await put(pathname, body, {
    access: "public",
    token,
    contentType,
    allowOverwrite: true,
  });
  // Same pathname overwrite can keep the same public URL; bust browser/CDN cache.
  const base = blob.url;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}v=${Date.now()}`;
}

const TOURNAMENT_LOGO_PATH = (tournamentId: string) => `tournaments/${tournamentId}/logo`;
const TOURNAMENT_TROPHY_PATH = (tournamentId: string) => `tournaments/${tournamentId}/trophy`;

/**
 * Removes tournament logo and trophy blobs if they exist. Ignores missing objects.
 */
export async function deleteTournamentBlobAssets(tournamentId: string): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return;

  for (const pathname of [TOURNAMENT_LOGO_PATH(tournamentId), TOURNAMENT_TROPHY_PATH(tournamentId)]) {
    try {
      await del(pathname, { token });
    } catch (e) {
      if (e instanceof BlobNotFoundError) continue;
      throw e;
    }
  }
}
