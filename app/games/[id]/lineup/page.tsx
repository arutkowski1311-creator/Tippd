"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Printer,
  PlayCircle,
  Lock,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// Using simple state toggle instead of Tabs component
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FieldingGrid } from "@/components/softball/fielding-grid";
import { PositionPicker } from "@/components/softball/position-picker";
import { validateLineup, hasErrors } from "@/lib/validation";
import type {
  GameData,
  PlayerData,
  BattingOrderEntry,
  FieldingAssignment,
  ValidationWarning,
  Position,
} from "@/lib/types";
import { cn, playerFullName } from "@/lib/utils";

interface BattingEntry extends BattingOrderEntry {
  player: PlayerData;
}

interface FieldingEntry extends FieldingAssignment {
  player: PlayerData;
}

export default function LineupEditorPage() {
  const router = useRouter();
  const params = useParams();
  const gameId = params.id as string;

  const [game, setGame] = useState<GameData | null>(null);
  const [battingOrder, setBattingOrder] = useState<BattingEntry[]>([]);
  const [fieldingAssignments, setFieldingAssignments] = useState<FieldingEntry[]>([]);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [lineupLocked, setLineupLocked] = useState(false);
  const [warnings, setWarnings] = useState<ValidationWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<"batting" | "fielding">("batting");

  // Position picker dialog
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerInning, setPickerInning] = useState<number>(1);
  const [pickerPosition, setPickerPosition] = useState<Position>("P");
  const [pickerPlayerId, setPickerPlayerId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [gameRes, lineupRes] = await Promise.all([
        fetch(`/api/games/${gameId}`),
        fetch(`/api/games/${gameId}/lineup`),
      ]);
      if (!gameRes.ok || !lineupRes.ok) throw new Error("Failed to load");

      const gameData = await gameRes.json();
      const lineupData = await lineupRes.json();

      setGame(gameData);
      setBattingOrder(Array.isArray(lineupData.battingOrder) ? lineupData.battingOrder : []);
      setFieldingAssignments(Array.isArray(lineupData.fieldingAssignments) ? lineupData.fieldingAssignments : []);
      setLineupLocked(lineupData.lineupLocked || false);

      // Build player list from batting order
      const playerMap = new Map<string, PlayerData>();
      for (const b of lineupData.battingOrder || []) {
        if (b.player) playerMap.set(b.player.id, b.player);
      }
      for (const f of lineupData.fieldingAssignments || []) {
        if (f.player) playerMap.set(f.player.id, f.player);
      }
      setPlayers(Array.from(playerMap.values()));
    } catch {
      toast.error("Failed to load lineup");
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Validate whenever lineup changes
  useEffect(() => {
    if (battingOrder.length === 0) return;
    const playerIds = battingOrder.map((b) => b.playerId);
    const w = validateLineup(
      battingOrder.map((b) => ({ battingSlot: b.battingSlot, playerId: b.playerId })),
      fieldingAssignments.map((f) => ({
        inningNumber: f.inningNumber,
        position: f.position as Position,
        playerId: f.playerId,
        assignmentType: f.assignmentType,
      })),
      playerIds
    );
    setWarnings(w);
  }, [battingOrder, fieldingAssignments]);

  function moveBatter(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= battingOrder.length) return;
    const newOrder = [...battingOrder];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    // Renumber slots
    const renumbered = newOrder.map((b, i) => ({
      ...b,
      battingSlot: i + 1,
    }));
    setBattingOrder(renumbered);
  }

  function handleCellClick(inning: number, position: Position) {
    if (lineupLocked) return;
    setPickerInning(inning);
    setPickerPosition(position);
    const current = fieldingAssignments.find(
      (f) => f.inningNumber === inning && f.position === position
    );
    setPickerPlayerId(current?.playerId || null);
    setPickerOpen(true);
  }

  function assignPlayerToCell(playerId: string) {
    const updated = fieldingAssignments.filter(
      (f) => !(f.inningNumber === pickerInning && f.position === pickerPosition)
    );
    // Also remove this player from this inning if they were somewhere else
    const withoutPlayer = updated.filter(
      (f) => !(f.inningNumber === pickerInning && f.playerId === playerId)
    );
    const player = players.find((p) => p.id === playerId);
    if (player) {
      withoutPlayer.push({
        inningNumber: pickerInning,
        position: pickerPosition,
        playerId,
        assignmentType: "planned",
        player,
      });
    }
    setFieldingAssignments(withoutPlayer);
    setPickerOpen(false);
  }

  async function saveLineup(lock = false) {
    setSaving(true);
    try {
      const res = await fetch(`/api/games/${gameId}/lineup`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          battingOrder: battingOrder.map((b) => ({
            battingSlot: b.battingSlot,
            playerId: b.playerId,
          })),
          fieldingAssignments: fieldingAssignments.map((f) => ({
            inningNumber: f.inningNumber,
            position: f.position,
            playerId: f.playerId,
            assignmentType: f.assignmentType,
          })),
          lineupLocked: lock || lineupLocked,
        }),
      });
      if (!res.ok) throw new Error();
      if (lock) {
        setLineupLocked(true);
        toast.success("Lineup locked!");
      } else {
        toast.success("Lineup saved");
      }
    } catch {
      toast.error("Failed to save lineup");
    } finally {
      setSaving(false);
    }
  }

  async function remix(mode: "batting" | "fielding" | "all") {
    if (!game) return;
    setSaving(true);
    try {
      // Use batting order player IDs, or fall back to fetching roster
      let playerIds = battingOrder.map((b) => b.playerId);
      if (playerIds.length === 0) {
        const rosterRes = await fetch("/api/players");
        if (rosterRes.ok) {
          const rosterData = await rosterRes.json();
          if (Array.isArray(rosterData)) {
            playerIds = rosterData.map((p: { id: string }) => p.id);
          }
        }
      }
      if (playerIds.length === 0) {
        toast.error("No players available");
        setSaving(false);
        return;
      }
      const body: Record<string, unknown> = {
        playerIds,
        coachMode: game.coachMode,
        defensiveFormat: game.defensiveFormat,
      };

      if (mode === "batting") {
        body.lockedFielding = fieldingAssignments.map((f) => ({
          inning: f.inningNumber,
          position: f.position,
          playerId: f.playerId,
        }));
      } else if (mode === "fielding") {
        body.lockedBatting = battingOrder.map((b) => ({
          slot: b.battingSlot,
          playerId: b.playerId,
        }));
      }

      const res = await fetch(`/api/games/${gameId}/lineup/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const lineup = await res.json();

      // Save new lineup
      const saveRes = await fetch(`/api/games/${gameId}/lineup`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          battingOrder: lineup.battingOrder,
          fieldingAssignments: lineup.fieldingAssignments,
        }),
      });
      if (!saveRes.ok) throw new Error();

      await fetchData();
      toast.success("Lineup remixed!");
    } catch {
      toast.error("Failed to remix lineup");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const errorWarnings = warnings.filter((w) => w.type === "error");
  const warnWarnings = warnings.filter((w) => w.type === "warning");

  return (
    <div className="flex flex-col gap-4 px-4 py-6 max-w-lg mx-auto pb-40">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/games")}>
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gold-gradient">
            {game ? `vs ${game.opponentName}` : "Lineup"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {lineupLocked ? "Locked" : "Editable"}
          </p>
        </div>
      </header>

      {/* Validation warnings */}
      {errorWarnings.length > 0 && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
          <p className="text-sm font-medium text-red-400">
            {errorWarnings.length} error(s)
          </p>
          {errorWarnings.slice(0, 3).map((w, i) => (
            <p key={i} className="text-xs text-red-300 mt-1">{w.message}</p>
          ))}
        </div>
      )}
      {warnWarnings.length > 0 && (
        <div className="rounded-lg bg-[hsl(46_100%_50%/0.08)] border border-[hsl(46_100%_50%/0.25)] p-3">
          {warnWarnings.map((w, i) => (
            <p key={i} className="text-xs text-[hsl(46_100%_60%)]">{w.message}</p>
          ))}
        </div>
      )}

      {/* Tab toggle */}
      <div className="flex rounded-lg bg-[hsl(0_0%_10%)] border border-[hsl(0_0%_15%)] p-0.5">
        <button
          type="button"
          onClick={() => setActiveTab("batting")}
          className={cn(
            "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
            activeTab === "batting"
              ? "bg-[hsl(46_100%_50%/0.15)] text-[hsl(46_100%_50%)]"
              : "text-[hsl(0_0%_50%)] hover:text-[hsl(0_0%_70%)]"
          )}
        >
          Batting Order
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("fielding")}
          className={cn(
            "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
            activeTab === "fielding"
              ? "bg-[hsl(46_100%_50%/0.15)] text-[hsl(46_100%_50%)]"
              : "text-[hsl(0_0%_50%)] hover:text-[hsl(0_0%_70%)]"
          )}
        >
          Fielding
        </button>
      </div>

      {/* Batting Order */}
      {activeTab === "batting" && (
        <div className="flex flex-col gap-1">
          {battingOrder.map((entry, index) => (
            <div
              key={entry.playerId}
              className="flex items-center gap-2 rounded-lg bg-[hsl(0_0%_10%)] border border-[hsl(0_0%_16%)] px-3 py-2"
            >
              <span className="text-sm font-bold text-[hsl(46_100%_50%/0.7)] w-6 text-center">
                {entry.battingSlot}
              </span>
              <span className="flex-1 font-medium text-sm truncate text-[hsl(0_0%_93%)]">
                {entry.player
                  ? playerFullName(entry.player.firstName, entry.player.lastName)
                  : entry.playerId}
              </span>
              {!lineupLocked && (
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => moveBatter(index, -1)}
                    disabled={index === 0}
                    className="p-0.5 text-[hsl(46_100%_50%/0.6)] hover:text-[hsl(46_100%_50%)] disabled:opacity-30 transition-colors"
                  >
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBatter(index, 1)}
                    disabled={index === battingOrder.length - 1}
                    className="p-0.5 text-[hsl(46_100%_50%/0.6)] hover:text-[hsl(46_100%_50%)] disabled:opacity-30 transition-colors"
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Fielding */}
      {activeTab === "fielding" && (
        <FieldingGrid
          assignments={fieldingAssignments}
          players={players}
          onCellClick={lineupLocked ? undefined : handleCellClick}
          defensiveFormat={(game?.defensiveFormat as import("@/lib/types").DefensiveFormat) || "four_outfield"}
          allPlayerIds={battingOrder.map((b) => b.playerId)}
        />
      )}

      {/* Action buttons */}
      <div className="fixed bottom-[4rem] inset-x-0 bg-[hsl(0_0%_7%)] border-t border-[hsl(0_0%_20%)] px-4 py-2 z-50">
        <div className="max-w-lg mx-auto flex flex-wrap gap-2">
          {!lineupLocked && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => remix("batting")}
                disabled={saving}
                className="border-[hsl(0_0%_20%)] text-[hsl(0_0%_85%)] hover:bg-[hsl(0_0%_15%)]"
              >
                <RefreshCw className="size-3.5 mr-1" />
                Remix Batting
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => remix("fielding")}
                disabled={saving}
                className="border-[hsl(0_0%_20%)] text-[hsl(0_0%_85%)] hover:bg-[hsl(0_0%_15%)]"
              >
                <RefreshCw className="size-3.5 mr-1" />
                Remix Fielding
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => remix("all")}
                disabled={saving}
                className="border-[hsl(0_0%_20%)] text-[hsl(0_0%_85%)] hover:bg-[hsl(0_0%_15%)]"
              >
                <RefreshCw className="size-3.5 mr-1" />
                Remix All
              </Button>
              <Button
                size="sm"
                onClick={() => saveLineup(true)}
                disabled={saving || hasErrors(warnings)}
                className="bg-cardinal-gradient text-white hover:opacity-90"
              >
                <Lock className="size-3.5 mr-1 text-[hsl(46_100%_50%)]" />
                Lock Lineup
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/games/${gameId}/print`)}
            className="border-[hsl(0_0%_20%)] text-[hsl(0_0%_85%)] hover:bg-[hsl(0_0%_15%)]"
          >
            <Printer className="size-3.5 mr-1" />
            Print
          </Button>
          {lineupLocked && (
            <Button
              size="sm"
              onClick={() => router.push(`/games/${gameId}/live`)}
              className="bg-cardinal-gradient text-white hover:opacity-90"
            >
              <PlayCircle className="size-3.5 mr-1" />
              Start Game
            </Button>
          )}
        </div>
      </div>

      {/* Position picker dialog for reassigning fielding */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="bg-[hsl(0_0%_9%)] border-[hsl(0_0%_16%)]">
          <DialogHeader>
            <DialogTitle className="text-gold-gradient">
              Inning {pickerInning} - {pickerPosition}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
            {players.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => assignPlayerToCell(player.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                  pickerPlayerId === player.id
                    ? "bg-[hsl(46_100%_50%/0.12)] ring-1 ring-[hsl(46_100%_50%/0.5)] text-[hsl(0_0%_93%)]"
                    : "bg-[hsl(0_0%_11%)] text-[hsl(0_0%_85%)] hover:bg-[hsl(0_0%_14%)]"
                )}
              >
                <span className="flex-1 font-medium text-sm">
                  {playerFullName(player.firstName, player.lastName)}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
