import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { poolMatchChannelName } from "@/lib/pusher-pool-constants";
import { getPusher } from "@/lib/pusher-server";
import { verifyPoolLiveReadCookies } from "@/lib/recorder-auth";

const PREFIX = "private-pool-match-";

export async function POST(request: Request) {
  const ok = await verifyPoolLiveReadCookies();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pusher = getPusher();
  if (!pusher) {
    return NextResponse.json({ error: "Pusher not configured" }, { status: 503 });
  }

  let socketId: string;
  let channelName: string;
  try {
    const form = await request.formData();
    const sid = form.get("socket_id");
    const ch = form.get("channel_name");
    if (typeof sid !== "string" || typeof ch !== "string") {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    socketId = sid;
    channelName = ch;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (!channelName.startsWith(PREFIX)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const matchId = channelName.slice(PREFIX.length);
  if (!matchId || channelName !== poolMatchChannelName(matchId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const match = await prisma.match.findFirst({
    where: { id: matchId },
    select: { id: true },
  });
  if (!match) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const auth = pusher.authorizeChannel(socketId, channelName);
  return NextResponse.json(auth);
}
