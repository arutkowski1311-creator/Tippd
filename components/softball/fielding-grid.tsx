"use client";

import { cn } from "@/lib/utils";
import { INNINGS, getPositionsForFormat } from "@/lib/types";
import type { Position, DefensiveFormat } from "@/lib/types";
import { Lock } from "lucide-react";

interface FieldingAssignment {
  inningNumber: number;
  position: string;
  playerId: string;
  assignmentType: string;
}

interface Player {
  id: string;
  firstName: string;
  lastName: string;
}

interface FieldingGridProps {
  assignments: FieldingAssignment[];
  players: Player[];
  onCellClick?: (inning: number, position: Position) => void;
  lockedCells?: Set<string>;
  defensiveFormat?: DefensiveFormat;
  allPlayerIds?: string[];
}

export function FieldingGrid({
  assignments,
  players,
  onCellClick,
  lockedCells,
  defensiveFormat = "four_outfield",
  allPlayerIds,
}: FieldingGridProps) {
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const positions = getPositionsForFormat(defensiveFormat);

  function getAssignment(inning: number, position: Position) {
    return assignments.find(
      (a) => a.inningNumber === inning && a.position === position
    );
  }

  function getCellKey(inning: number, position: Position) {
    return `${inning}-${position}`;
  }

  // Calculate bench players per inning (players not assigned to any position)
  function getBenchPlayers(inning: number): Player[] {
    if (!allPlayerIds || allPlayerIds.length === 0) return [];
    const assignedThisInning = new Set(
      assignments
        .filter((a) => a.inningNumber === inning)
        .map((a) => a.playerId)
    );
    return allPlayerIds
      .filter((id) => !assignedThisInning.has(id))
      .map((id) => playerMap.get(id))
      .filter((p): p is Player => !!p);
  }

  const hasBench = allPlayerIds && allPlayerIds.length > positions.length;

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-[hsl(0_0%_7%)] px-2 py-2 text-left font-bold text-[hsl(46_100%_50%)] w-12">
              Pos
            </th>
            {INNINGS.map((inning) => (
              <th
                key={inning}
                className="px-1 py-2 text-center font-medium text-[hsl(0_0%_55%)] min-w-[60px]"
              >
                {inning}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {positions.map((position) => (
            <tr key={position} className="border-t border-[hsl(0_0%_14%)]">
              <td className="sticky left-0 z-10 bg-[hsl(0_0%_7%)] px-2 py-1 font-bold text-xs text-[hsl(46_100%_50%/0.8)]">
                {position}
              </td>
              {INNINGS.map((inning) => {
                const assignment = getAssignment(inning, position);
                const player = assignment
                  ? playerMap.get(assignment.playerId)
                  : null;
                const cellKey = getCellKey(inning, position);
                const isLocked = lockedCells?.has(cellKey);

                return (
                  <td key={inning} className="px-0.5 py-0.5">
                    <button
                      type="button"
                      onClick={() => onCellClick?.(inning, position)}
                      disabled={!onCellClick}
                      className={cn(
                        "flex items-center justify-center gap-0.5 w-full rounded px-1 py-1.5 text-xs font-medium transition-colors min-h-[32px]",
                        isLocked
                          ? "bg-[hsl(0_0%_12%)] text-[hsl(0_0%_40%)] cursor-default"
                          : player
                            ? "bg-[hsl(46_100%_50%/0.1)] text-[hsl(0_0%_90%)] border border-[hsl(46_100%_50%/0.2)] hover:bg-[hsl(46_100%_50%/0.18)] active:bg-[hsl(46_100%_50%/0.25)]"
                            : "bg-[hsl(0_0%_10%)] text-[hsl(0_0%_30%)] hover:bg-[hsl(0_0%_14%)] border border-[hsl(0_0%_14%)]"
                      )}
                    >
                      {isLocked && <Lock className="size-3 shrink-0 text-[hsl(0_0%_35%)]" />}
                      <span className="truncate">
                        {player ? player.firstName : "-"}
                      </span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
          {/* Bench row — shows players not in the field this inning (available to sub in) */}
          {hasBench && (
            <tr className="border-t-2 border-[hsl(46_100%_50%/0.25)]">
              <td className="sticky left-0 z-10 bg-[hsl(0_0%_7%)] px-2 py-1 font-bold text-[10px] text-[hsl(195_85%_60%)] uppercase tracking-wider align-top">
                Avail
              </td>
              {INNINGS.map((inning) => {
                const bench = getBenchPlayers(inning);
                return (
                  <td key={inning} className="px-0.5 py-0.5 align-top">
                    <div className="flex flex-col gap-0.5">
                      {bench.length > 0 ? (
                        bench.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-center w-full rounded px-1 py-1 text-xs font-medium bg-[hsl(195_60%_15%/0.4)] text-[hsl(195_85%_70%)] border border-[hsl(195_60%_30%/0.4)] min-h-[28px]"
                          >
                            <span className="truncate">{p.firstName}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center justify-center w-full rounded px-1 py-1.5 text-xs text-[hsl(0_0%_25%)] min-h-[32px]">
                          -
                        </div>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
