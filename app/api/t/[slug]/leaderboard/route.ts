import { NextResponse } from "next/server";
import { verifyPoolLiveReadCookies } from "@/lib/recorder-auth";
import { prisma } from "@/lib/prisma";
import {
  getPoolTournamentLeaderboard,
  type PoolLeaderMetric,
} from "@/lib/pool-leaderboard";

const METRICS: PoolLeaderMetric[] = ["made", "missed", "foul", "matches_won"];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!(await verifyPoolLiveReadCookies())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("metric") ?? "made";
  const metric = METRICS.includes(raw as PoolLeaderMetric) ? (raw as PoolLeaderMetric) : "made";

  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    select: { id: true, gameType: true },
  });
  if (!tournament) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = await getPoolTournamentLeaderboard(tournament.id, metric);
  return NextResponse.json({ metric, rows }, { headers: { "Cache-Control": "no-store" } });
}
