import { NextResponse } from "next/server";
import { verifyPoolLiveReadCookies } from "@/lib/recorder-auth";
import { getPoolMatchLiveSnapshot } from "@/lib/pool-match-snapshot";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; matchId: string }> },
) {
  if (!(await verifyPoolLiveReadCookies())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, matchId } = await params;
  const snapshot = await getPoolMatchLiveSnapshot(slug, matchId);
  if (!snapshot) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
