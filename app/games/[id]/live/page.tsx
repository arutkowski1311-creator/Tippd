"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Flag,
  Undo2,
  Plus,
  Minus,
  CircleDot,
  ChevronRight,
  Zap,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { LedScoreboard } from "@/components/softball/led-scoreboard";
import { cn } from "@/lib/utils";
import type { GameData, ScoreByInning } from "@/lib/types";

interface LiveState {
  currentInning: number;
  currentHalf: string;
  currentOuts: number;
  gameStatus: string;
  scoreByInning: ScoreByInning[];
}

interface GameEvent {
  id: string;
  type: string;
  inning: number;
  half: string;
  description: string;
  timestamp: string;
}

export default function LiveGamePage() {
  const router = useRouter();
  const params = useParams();
  const gameId = params.id as string;

  const [game, setGame] = useState<GameData | null>(null);
  const [liveState, setLiveState] = useState<LiveState | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchGame = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${gameId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setGame(data);
      setLiveState({
        currentInning: data.currentInning,
        currentHalf: data.currentHalf,
        currentOuts: data.currentOuts,
        gameStatus: data.gameStatus,
        scoreByInning: data.scoreByInning || [],
      });
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchGame();
    pollRef.current = setInterval(fetchGame, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchGame]);

  // Start game if scheduled
  const gameStatus = game?.gameStatus;
  useEffect(() => {
    if (gameStatus === "scheduled") {
      fetch(`/api/games/${gameId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameStatus: "live" }),
      }).then(() => fetchGame());
    }
  }, [gameStatus, gameId, fetchGame]);

  async function doAction(action: string) {
    setActing(true);
    setLastAction(action);
    try {
      const res = await fetch(`/api/games/${gameId}/live`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        await handleFallbackAction(action);
      } else {
        const data = await res.json();
        setLiveState(data);
        setGame((prev) => (prev ? { ...prev, ...data } : prev));

        if (
          action === "add_out" &&
          data.currentOuts === 0 &&
          liveState &&
          liveState.currentOuts === 2
        ) {
          toast.info("3 outs! Side retired.");
        }
      }

      // Add event to local feed
      const label = actionLabel(action);
      if (label) {
        setEvents((prev) => [
          {
            id: crypto.randomUUID(),
            type: action,
            inning: liveState?.currentInning || 1,
            half: liveState?.currentHalf || "top",
            description: label,
            timestamp: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 50));
      }
    } catch {
      toast.error("Action failed");
    } finally {
      setActing(false);
      setTimeout(() => setLastAction(null), 300);
    }
  }

  function actionLabel(action: string): string {
    switch (action) {
      case "add_run_us": return "Run scored!";
      case "sub_run_us": return "Run removed (undo)";
      case "add_run_opp": return "Opponent scored";
      case "sub_run_opp": return "Opponent run removed";
      case "add_out": return "Out recorded";
      case "undo_out": return "Out reversed";
      default: return "";
    }
  }

  async function handleFallbackAction(action: string) {
    if (!game || !liveState) return;

    let updates: Record<string, unknown> = {};
    const scoreByInning = [...(liveState.scoreByInning || [])];

    let currentScore = scoreByInning.find(
      (s) => s.inningNumber === liveState.currentInning
    );
    if (!currentScore) {
      currentScore = {
        inningNumber: liveState.currentInning,
        half: liveState.currentHalf as "top" | "bottom",
        usRuns: 0,
        opponentRuns: 0,
        outsRecorded: 0,
        completed: false,
      };
      scoreByInning.push(currentScore);
    }

    switch (action) {
      case "add_out": {
        const newOuts = liveState.currentOuts + 1;
        if (newOuts >= 3) {
          if (liveState.currentHalf === "top") {
            updates = { currentOuts: 0, currentHalf: "bottom" };
          } else {
            updates = {
              currentOuts: 0,
              currentHalf: "top",
              currentInning: liveState.currentInning + 1,
            };
          }
          toast.info("3 outs! Side retired.");
        } else {
          updates = { currentOuts: newOuts };
        }
        break;
      }
      case "undo_out":
        updates = { currentOuts: Math.max(0, liveState.currentOuts - 1) };
        break;
      case "add_run_us":
        currentScore.usRuns++;
        break;
      case "sub_run_us":
        currentScore.usRuns = Math.max(0, currentScore.usRuns - 1);
        break;
      case "add_run_opp":
        currentScore.opponentRuns++;
        break;
      case "sub_run_opp":
        currentScore.opponentRuns = Math.max(0, currentScore.opponentRuns - 1);
        break;
    }

    const res = await fetch(`/api/games/${gameId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      await fetchGame();
    }
  }

  async function handleFinalize() {
    setFinalizing(true);
    try {
      let res = await fetch(`/api/games/${gameId}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const totalUs = (liveState?.scoreByInning || []).reduce(
          (sum, s) => sum + s.usRuns,
          0
        );
        const totalOpp = (liveState?.scoreByInning || []).reduce(
          (sum, s) => sum + s.opponentRuns,
          0
        );
        res = await fetch(`/api/games/${gameId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameStatus: "final",
            finalTeamScore: totalUs,
            finalOpponentScore: totalOpp,
          }),
        });
      }

      toast.success("Game finalized!");
      setFinalizeOpen(false);
      router.push("/games");
    } catch {
      toast.error("Failed to finalize game");
    } finally {
      setFinalizing(false);
    }
  }

  // --- Loading state ---
  if (loading || !game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative">
          <div className="size-12 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
        </div>
        <p className="text-gold-dim text-sm font-medium tracking-wide uppercase">
          Loading game...
        </p>
      </div>
    );
  }

  const scoreInnings = (liveState?.scoreByInning || []).map((s) => ({
    inningNumber: s.inningNumber,
    usRuns: s.usRuns,
    opponentRuns: s.opponentRuns,
  }));

  const totalUs = scoreInnings.reduce((sum, s) => sum + s.usRuns, 0);
  const totalOpp = scoreInnings.reduce((sum, s) => sum + s.opponentRuns, 0);

  const currentInning = liveState?.currentInning || 1;
  const currentHalf = liveState?.currentHalf || "top";
  const currentOuts = liveState?.currentOuts || 0;
  const teamName = game.homeOrAway === "home" ? "Home" : "Us";
  const isGameFinal = liveState?.gameStatus === "final";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(0,0%,5%)] via-[hsl(0,5%,8%)] to-[hsl(0,0%,5%)]">
      <div className="flex flex-col gap-5 px-4 py-4 max-w-lg mx-auto pb-24">
        {/* --- Header --- */}
        <div className="no-print flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => router.push(`/games/${gameId}/lineup`)}
            className="flex items-center justify-center size-10 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="size-5 text-gold-dim" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">
              vs {game.opponentName}
            </h1>
            <p className="text-xs text-gold-dim/60 uppercase tracking-widest font-medium">
              Live Game Tracker
            </p>
          </div>
          {!isGameFinal && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/30">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-red-500" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                Live
              </span>
            </div>
          )}
        </div>

        {/* --- LED Scoreboard Hero --- */}
        <div className="relative">
          {/* Ambient glow behind scoreboard */}
          <div className="absolute inset-0 -m-4 bg-gradient-to-b from-gold/5 via-transparent to-transparent rounded-3xl blur-2xl pointer-events-none" />
          <LedScoreboard
            teamName={teamName}
            opponentName={game.opponentName}
            teamScore={totalUs}
            opponentScore={totalOpp}
            inning={currentInning}
            isBottom={currentHalf === "bottom"}
            balls={0}
            strikes={0}
            outs={currentOuts}
            isLive={!isGameFinal}
          />
        </div>

        {/* --- Inning-by-Inning Line Score --- */}
        {scoreInnings.length > 0 && (
          <div className="scoreboard-panel rounded-xl p-3 overflow-x-auto">
            <table className="w-full text-center">
              <thead>
                <tr>
                  <th className="text-[10px] uppercase tracking-widest text-gold-dim/50 font-medium text-left px-2 py-1">
                    Team
                  </th>
                  {scoreInnings.map((s) => (
                    <th
                      key={s.inningNumber}
                      className={cn(
                        "text-[10px] uppercase tracking-widest font-medium px-2 py-1 min-w-[28px]",
                        s.inningNumber === currentInning
                          ? "text-gold"
                          : "text-gold-dim/50"
                      )}
                    >
                      {s.inningNumber}
                    </th>
                  ))}
                  <th className="text-[10px] uppercase tracking-widest text-gold font-bold px-2 py-1 border-l border-gold/20">
                    R
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-xs font-bold text-gold-gradient text-left px-2 py-1.5">
                    {teamName}
                  </td>
                  {scoreInnings.map((s) => (
                    <td
                      key={s.inningNumber}
                      className={cn(
                        "text-sm font-mono font-bold px-2 py-1.5",
                        s.inningNumber === currentInning
                          ? "text-gold led-glow"
                          : "text-white/60"
                      )}
                    >
                      {s.usRuns}
                    </td>
                  ))}
                  <td className="text-sm font-mono font-black text-gold led-glow px-2 py-1.5 border-l border-gold/20">
                    {totalUs}
                  </td>
                </tr>
                <tr>
                  <td className="text-xs font-bold text-white/50 text-left px-2 py-1.5">
                    {game.opponentName}
                  </td>
                  {scoreInnings.map((s) => (
                    <td
                      key={s.inningNumber}
                      className={cn(
                        "text-sm font-mono font-bold px-2 py-1.5",
                        s.inningNumber === currentInning
                          ? "text-white/80"
                          : "text-white/40"
                      )}
                    >
                      {s.opponentRuns}
                    </td>
                  ))}
                  <td className="text-sm font-mono font-black text-white/70 px-2 py-1.5 border-l border-gold/20">
                    {totalOpp}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* --- Action Buttons --- */}
        {!isGameFinal && (
          <div className="flex flex-col gap-3">
            {/* Scoring Row */}
            <div className="grid grid-cols-2 gap-3">
              {/* +1 Run (Our Team) - Hero Button */}
              <button
                type="button"
                onClick={() => doAction("add_run_us")}
                disabled={acting}
                className={cn(
                  "relative group flex flex-col items-center justify-center rounded-2xl font-bold",
                  "min-h-[72px] h-[72px]",
                  "bg-gradient-to-b from-gold to-gold-dim",
                  "text-black shadow-lg shadow-gold/20",
                  "active:scale-[0.97] active:shadow-gold/40 active:shadow-xl",
                  "transition-all duration-150 ease-out",
                  "disabled:opacity-50 disabled:active:scale-100",
                  lastAction === "add_run_us" && "scale-[0.97] shadow-gold/40 shadow-xl"
                )}
              >
                <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-2">
                  <Plus className="size-6 stroke-[3]" />
                  <span className="text-2xl font-black tracking-tight">1 RUN</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 mt-0.5">
                  Our Team
                </span>
              </button>

              {/* +1 Run (Opponent) */}
              <button
                type="button"
                onClick={() => doAction("add_run_opp")}
                disabled={acting}
                className={cn(
                  "relative group flex flex-col items-center justify-center rounded-2xl font-bold",
                  "min-h-[72px] h-[72px]",
                  "bg-white/[0.06] border border-white/10",
                  "text-white/70 hover:text-white hover:bg-white/10",
                  "active:scale-[0.97] active:bg-white/15",
                  "transition-all duration-150 ease-out",
                  "disabled:opacity-50 disabled:active:scale-100",
                  lastAction === "add_run_opp" && "scale-[0.97] bg-white/15"
                )}
              >
                <div className="flex items-center gap-2">
                  <Plus className="size-5 stroke-[2.5]" />
                  <span className="text-xl font-bold tracking-tight">1 RUN</span>
                </div>
                <span className="text-[10px] font-medium uppercase tracking-widest opacity-50 mt-0.5">
                  {game.opponentName}
                </span>
              </button>
            </div>

            {/* Record Out + Next Inning */}
            <div className="grid grid-cols-2 gap-3">
              {/* Record Out */}
              <button
                type="button"
                onClick={() => doAction("add_out")}
                disabled={acting}
                className={cn(
                  "relative group flex items-center justify-center gap-2 rounded-2xl font-bold",
                  "min-h-[56px] h-[56px]",
                  "bg-cardinal-gradient border border-cardinal-bright/30",
                  "text-white shadow-lg shadow-cardinal/20",
                  "active:scale-[0.97] active:shadow-cardinal/40",
                  "transition-all duration-150 ease-out",
                  "disabled:opacity-50 disabled:active:scale-100",
                  lastAction === "add_out" && "scale-[0.97] shadow-cardinal/40"
                )}
              >
                <CircleDot className="size-5" />
                <span className="text-lg font-bold tracking-wide">Record Out</span>
                {/* Out count pills */}
                <div className="absolute top-2 right-3 flex gap-1">
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "size-2 rounded-full transition-colors",
                        i < currentOuts ? "bg-gold shadow-[0_0_6px_hsl(46,100%,55%,0.6)]" : "bg-white/20"
                      )}
                    />
                  ))}
                </div>
              </button>

              {/* Undo */}
              <button
                type="button"
                onClick={() => doAction("undo_out")}
                disabled={acting || currentOuts === 0}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-2xl",
                  "min-h-[56px] h-[56px]",
                  "bg-transparent border border-white/10",
                  "text-white/50 hover:text-white/70 hover:border-white/20 hover:bg-white/5",
                  "active:scale-[0.97]",
                  "transition-all duration-150 ease-out",
                  "disabled:opacity-30 disabled:active:scale-100"
                )}
              >
                <Undo2 className="size-4" />
                <span className="text-sm font-semibold">Undo Out</span>
              </button>
            </div>

            {/* Undo Run Buttons (subtle) */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => doAction("sub_run_us")}
                disabled={acting || totalUs === 0}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl",
                  "h-9",
                  "bg-transparent border border-gold/10",
                  "text-gold-dim/50 hover:text-gold-dim hover:border-gold/20",
                  "transition-all duration-150",
                  "disabled:opacity-20"
                )}
              >
                <Minus className="size-3" />
                <span className="text-xs font-medium">Undo Run</span>
              </button>
              <button
                type="button"
                onClick={() => doAction("sub_run_opp")}
                disabled={acting || totalOpp === 0}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl",
                  "h-9",
                  "bg-transparent border border-white/[0.06]",
                  "text-white/30 hover:text-white/50 hover:border-white/10",
                  "transition-all duration-150",
                  "disabled:opacity-20"
                )}
              >
                <Minus className="size-3" />
                <span className="text-xs font-medium">Undo Opp Run</span>
              </button>
            </div>
          </div>
        )}

        {/* --- Play-by-Play Feed --- */}
        {events.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-1">
              <Zap className="size-3.5 text-gold" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-gold-dim/70">
                Play-by-Play
              </h2>
            </div>
            <Card className="bg-white/[0.03] border-white/[0.06] overflow-hidden">
              <div className="divide-y divide-white/[0.04]">
                {events.slice(0, 10).map((event, idx) => (
                  <div
                    key={event.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 transition-colors",
                      idx === 0 && "bg-gold/[0.04]"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center size-8 rounded-full shrink-0",
                        event.type.includes("run_us")
                          ? "bg-gold/15 text-gold"
                          : event.type.includes("run_opp")
                            ? "bg-white/10 text-white/60"
                            : event.type.includes("out")
                              ? "bg-cardinal/15 text-cardinal-bright"
                              : "bg-white/5 text-white/40"
                      )}
                    >
                      {event.type.includes("run") ? (
                        <Plus className="size-3.5" />
                      ) : event.type.includes("out") ? (
                        <CircleDot className="size-3.5" />
                      ) : (
                        <ChevronRight className="size-3.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          event.type.includes("run_us")
                            ? "text-gold"
                            : "text-white/80"
                        )}
                      >
                        {event.description}
                      </p>
                      <p className="text-[10px] text-white/30 font-medium uppercase tracking-wider">
                        {event.half === "top" ? "Top" : "Bot"} {event.inning}
                        {" \u00b7 "}
                        {new Date(event.timestamp).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* --- Finalize Game --- */}
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setFinalizeOpen(true)}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-2xl",
              "h-14",
              "transition-all duration-200",
              isGameFinal
                ? "bg-gold/10 border border-gold/20 text-gold font-bold"
                : "bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/60 hover:border-white/10"
            )}
          >
            {isGameFinal ? (
              <>
                <Trophy className="size-5" />
                <span className="text-base font-bold">
                  Final: {totalUs} - {totalOpp}
                </span>
              </>
            ) : (
              <>
                <Flag className="size-4" />
                <span className="text-sm font-semibold">Finalize Game</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* --- Finalize Dialog --- */}
      <Dialog open={finalizeOpen} onOpenChange={setFinalizeOpen}>
        <DialogContent className="bg-[hsl(0,0%,8%)] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">
              Finalize Game?
            </DialogTitle>
            <DialogDescription className="text-white/50">
              This will end the game and record the final score as{" "}
              <span className="text-gold font-bold">{totalUs}</span>
              {" - "}
              <span className="text-white font-bold">{totalOpp}</span>.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setFinalizeOpen(false)}
              className="border-white/10 text-white/60 hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              onClick={handleFinalize}
              disabled={finalizing}
              className="bg-cardinal-gradient border-cardinal-bright/30 text-white font-bold hover:opacity-90"
            >
              {finalizing ? (
                <span className="flex items-center gap-2">
                  <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Finalizing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Flag className="size-4" />
                  Finalize
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
