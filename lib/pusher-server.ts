import Pusher from "pusher";

let pusherSingleton: Pusher | null | undefined;

/** Returns null when Pusher env is not configured (local dev without keys). */
export function getPusher(): Pusher | null {
  if (pusherSingleton !== undefined) {
    return pusherSingleton;
  }
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;
  if (!appId || !key || !secret || !cluster) {
    pusherSingleton = null;
    return null;
  }
  pusherSingleton = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });
  return pusherSingleton;
}
