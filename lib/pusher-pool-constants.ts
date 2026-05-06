/** Pusher private channel + event (shared by server publish, auth route, and client). */

export const POOL_MATCH_EVENT = "pool-match-updated" as const;

export function poolMatchChannelName(matchId: string): string {
  return `private-pool-match-${matchId}`;
}
