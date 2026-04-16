import { PlayerAvatar } from "@/components/player-avatar";

export type AdminMatchTeamForAvatars = {
  teamPlayers: Array<{
    slotIndex: number;
    player: { id: string; name: string; avatarUrl: string | null };
  }>;
};

function sortedPlayers(team: AdminMatchTeamForAvatars) {
  return [...team.teamPlayers]
    .sort((a, b) => a.slotIndex - b.slotIndex)
    .map((tp) => tp.player);
}

/** Player avatars for a match team (admin picks); omits when no roster. */
export function AdminMatchTeamAvatars({
  team,
  size = 22,
  className,
}: {
  team: AdminMatchTeamForAvatars | null | undefined;
  size?: number;
  className?: string;
}) {
  if (!team) return null;
  const players = sortedPlayers(team);
  if (players.length === 0) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 ${className ?? ""}`}
      aria-hidden
    >
      {players.map((p) => (
        <span
          key={p.id}
          className="overflow-hidden rounded-full ring-1 ring-border bg-background"
        >
          <PlayerAvatar name={p.name} url={p.avatarUrl} size={size} />
        </span>
      ))}
    </span>
  );
}
