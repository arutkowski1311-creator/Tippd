"use client";

import { cn } from "@/lib/utils";
import { INFIELD_POSITIONS } from "@/lib/types";
import type { Position } from "@/lib/types";

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

interface FieldingStatsProps {
  assignments: FieldingAssignment[];
  players: Player[];
  allPlayerIds: string[];
  totalInnings?: number;
}

interface PlayerStats {
  player: Player;
  infield: number;
  outfield: number;
  bench: number;
}

export function FieldingStats({
  assignments,
  players,
  allPlayerIds,
  totalInnings = 6,
}: FieldingStatsProps) {
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const infieldSet = new Set<string>(INFIELD_POSITIONS);

  const stats: PlayerStats[] = allPlayerIds
    .map((id) => {
      const player = playerMap.get(id);
      if (!player) return null;
      let infield = 0;
      let outfield = 0;
      const inningsAssigned = new Set<number>();
      for (const a of assignments) {
        if (a.playerId !== id) continue;
        inningsAssigned.add(a.inningNumber);
        if (infieldSet.has(a.position as Position)) {
          infield++;
        } else {
          outfield++;
        }
      }
      const bench = Math.max(0, totalInnings - inningsAssigned.size);
      return { player, infield, outfield, bench };
    })
    .filter((s): s is PlayerStats => s !== null)
    .sort((a, b) => {
      // Sort by bench (highest bench first to flag players not in)
      if (b.bench !== a.bench) return b.bench - a.bench;
      return a.player.firstName.localeCompare(b.player.firstName);
    });

  if (stats.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-[hsl(0_0%_14%)] bg-[hsl(0_0%_8%)] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[hsl(0_0%_14%)] bg-[hsl(0_0%_10%)]">
        <span className="text-xs font-bold text-[hsl(46_100%_50%)] uppercase tracking-wider">
          Innings Breakdown
        </span>
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
          <span className="text-[hsl(0_0%_55%)]">IF</span>
          <span className="text-[hsl(0_0%_55%)]">OF</span>
          <span className="text-[hsl(0_0%_40%)]">BN</span>
        </div>
      </div>
      <div className="divide-y divide-[hsl(0_0%_12%)]">
        {stats.map((s) => (
          <div
            key={s.player.id}
            className="flex items-center justify-between px-3 py-1.5"
          >
            <span className="text-sm font-medium text-[hsl(0_0%_88%)] truncate">
              {s.player.firstName} {s.player.lastName[0]}.
            </span>
            <div className="flex items-center gap-3 font-mono text-sm tabular-nums">
              <span
                className={cn(
                  "w-5 text-center font-bold",
                  s.infield > 0
                    ? "text-[hsl(46_100%_50%)]"
                    : "text-[hsl(0_0%_30%)]"
                )}
              >
                {s.infield}
              </span>
              <span
                className={cn(
                  "w-5 text-center font-bold",
                  s.outfield > 0
                    ? "text-[hsl(195_85%_60%)]"
                    : "text-[hsl(0_0%_30%)]"
                )}
              >
                {s.outfield}
              </span>
              <span
                className={cn(
                  "w-5 text-center font-bold",
                  s.bench > 0
                    ? "text-[hsl(0_0%_55%)]"
                    : "text-[hsl(0_0%_25%)]"
                )}
              >
                {s.bench}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
