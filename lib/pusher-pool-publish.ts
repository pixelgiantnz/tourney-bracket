import { POOL_MATCH_EVENT, poolMatchChannelName } from "@/lib/pusher-pool-constants";
import { getPusher } from "@/lib/pusher-server";

/** Fire-and-forget; never throws — pool writes must succeed even if Pusher is down. */
export function publishPoolMatchUpdated(matchId: string, slug: string): void {
  const pusher = getPusher();
  if (!pusher) return;
  void pusher
    .trigger(poolMatchChannelName(matchId), POOL_MATCH_EVENT, { matchId, slug })
    .catch((err: unknown) => {
      console.error("[pusher] trigger failed", err);
    });
}
