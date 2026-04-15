"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useState, useTransition } from "react";
import { AdminTeamCard, type AdminTeamCardProps } from "@/components/admin-team-card";
import { reorderTeamSeeds } from "@/lib/actions/admin";

type Team = AdminTeamCardProps["team"];

export type AdminSortableTeamsListProps = {
  tournamentId: string;
  playersPerTeam: number;
  allPlayers: AdminTeamCardProps["allPlayers"];
  teams: Team[];
};

function SortableTeamRow({
  team,
  tournamentId,
  playersPerTeam,
  allPlayers,
  rosterFormKey,
}: {
  team: Team;
  tournamentId: string;
  playersPerTeam: number;
  allPlayers: AdminTeamCardProps["allPlayers"];
  rosterFormKey: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: team.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : undefined,
  };

  return (
    <li ref={setNodeRef} style={style} className="flex list-none gap-2">
      <button
        type="button"
        className="mt-3 flex h-11 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-md border border-border bg-card text-muted hover:bg-background active:cursor-grabbing"
        aria-label={`Drag to reorder seed: ${team.name}`}
        {...attributes}
        {...listeners}
      >
        <span className="select-none text-lg leading-none text-muted" aria-hidden>
          ⋮⋮
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <AdminTeamCard
          team={team}
          tournamentId={tournamentId}
          playersPerTeam={playersPerTeam}
          allPlayers={allPlayers}
          rosterFormKey={rosterFormKey}
        />
      </div>
    </li>
  );
}

export function AdminSortableTeamsList({
  tournamentId,
  playersPerTeam,
  allPlayers,
  teams,
}: AdminSortableTeamsListProps) {
  const [orderedIds, setOrderedIds] = useState(() => teams.map((t) => t.id));
  const [, startTransition] = useTransition();

  const idsKey = teams.map((t) => t.id).join(",");
  useEffect(() => {
    setOrderedIds(teams.map((t) => t.id));
  }, [idsKey, teams]);

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const orderedTeams = useMemo(() => {
    return orderedIds.map((id) => teamById.get(id)).filter(Boolean) as Team[];
  }, [orderedIds, teamById]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedIds.indexOf(String(active.id));
    const newIndex = orderedIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(orderedIds, oldIndex, newIndex);
    setOrderedIds(next);
    startTransition(async () => {
      await reorderTeamSeeds(tournamentId, next);
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
        <ul className="mt-6 list-none space-y-4">
          {orderedTeams.map((team) => (
            <SortableTeamRow
              key={team.id}
              team={team}
              tournamentId={tournamentId}
              playersPerTeam={playersPerTeam}
              allPlayers={allPlayers}
              rosterFormKey={`${team.id}-roster-${Array.from({ length: playersPerTeam }, (_, i) => {
                const tp = team.teamPlayers.find((x) => x.slotIndex === i);
                return tp?.player.id ?? "";
              }).join(".")}`}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
