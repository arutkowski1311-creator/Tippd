"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Undo2, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OutTracker } from "@/components/softball/out-tracker";
import { BaseDiamond } from "@/components/softball/base-diamond";
import { playerFullName } from "@/lib/utils";
import type {
  GameData,
  PlayerData,
  PlateAppearanceData,
  PitchEventData,
  PitchResult,
  PlateAppearanceResult,
  ContactType,
  PlayResult,
  RunnersState,
  Position,
} from "@/lib/types";

interface ScorebookState {
  game: GameData;
  players: PlayerData[];
  currentPA: PlateAppearanceData | null;
  pitches: PitchEventData[];
  runners: RunnersState;
  currentBatter: PlayerData | null;
  currentPitcher: PlayerData | null;
}

type InPlayStep = "contact" | "position" | "result";

const CONTACT_TYPES: { value: ContactType; label: string }[] = [
  { value: "ground_ball", label: "Ground Ball" },
  { value: "line_drive", label: "Line Drive" },
  { value: "fly_ball", label: "Fly Ball" },
  { value: "pop_up", label: "Pop Up" },
  { value: "bunt", label: "Bunt" },
];

const FIELDER_POSITIONS: { value: Position; label: string }[] = [
  { value: "P", label: "P" },
  { value: "C", label: "C" },
  { value: "1B", label: "1B" },
  { value: "2B", label: "2B" },
  { value: "SS", label: "SS" },
  { value: "3B", label: "3B" },
  { value: "LF", label: "LF" },
  { value: "CF", label: "CF" },
  { value: "RF", label: "RF" },
];

const PLAY_RESULTS: { value: PlayResult; label: string }[] = [
  { value: "caught", label: "Caught" },
  { value: "safe", label: "Safe" },
  { value: "error", label: "Error" },
  { value: "out_at_first", label: "Out at 1st" },
  { value: "force_out", label: "Force Out" },
  { value: "tag_out", label: "Tag Out" },
  { value: "double_play", label: "Double Play" },
];

export default function ScorebookPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;

  const [state, setState] = useState<ScorebookState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // In-play flow state
  const [showInPlayFlow, setShowInPlayFlow] = useState(false);
  const [inPlayStep, setInPlayStep] = useState<InPlayStep>("contact");
  const [selectedContact, setSelectedContact] = useState<ContactType | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

  const fetchState = useCallback(() => {
    fetch(`/api/games/${gameId}/scorebook`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((d) => setState(d))
      .catch(() => toast.error("Failed to load scorebook"))
      .finally(() => setLoading(false));
  }, [gameId]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  async function recordPitch(pitchResult: PitchResult) {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/games/${gameId}/scorebook/pitch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pitchResult }),
      });
      if (!res.ok) throw new Error("Failed to record pitch");
      await fetchState();
    } catch {
      toast.error("Failed to record pitch");
    } finally {
      setActionLoading(false);
    }
  }

  async function recordResult(resultType: PlateAppearanceResult) {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/games/${gameId}/scorebook`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultType }),
      });
      if (!res.ok) throw new Error("Failed to record result");
      await fetchState();
    } catch {
      toast.error("Failed to record result");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUndo() {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/games/${gameId}/scorebook/undo`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to undo");
      await fetchState();
      toast.success("Undone");
    } catch {
      toast.error("Failed to undo");
    } finally {
      setActionLoading(false);
    }
  }

  function handleInPlay() {
    setShowInPlayFlow(true);
    setInPlayStep("contact");
    setSelectedContact(null);
    setSelectedPosition(null);
  }

  function handleContactSelect(contact: ContactType) {
    setSelectedContact(contact);
    setInPlayStep("position");
  }

  function handlePositionSelect(position: Position) {
    setSelectedPosition(position);
    setInPlayStep("result");
  }

  async function handlePlayResult(result: PlayResult) {
    setShowInPlayFlow(false);

    // Map the play result to a PA result
    let paResult: PlateAppearanceResult;
    if (result === "caught") {
      if (selectedContact === "fly_ball") paResult = "fly_out";
      else if (selectedContact === "line_drive") paResult = "line_out";
      else if (selectedContact === "pop_up") paResult = "pop_out";
      else paResult = "ground_out";
    } else if (result === "safe") {
      paResult = "single";
    } else if (result === "error") {
      paResult = "reached_on_error";
    } else if (result === "out_at_first" || result === "force_out" || result === "tag_out") {
      paResult = "ground_out";
    } else if (result === "double_play") {
      paResult = "double_play";
    } else {
      paResult = "ground_out";
    }

    // Record the pitch as in_play first, then the result
    setActionLoading(true);
    try {
      await fetch(`/api/games/${gameId}/scorebook/pitch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pitchResult: "in_play" }),
      });

      const res = await fetch(`/api/games/${gameId}/scorebook`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultType: paResult,
          contactType: selectedContact,
          fieldedBy: selectedPosition,
          playResult: result,
        }),
      });
      if (!res.ok) throw new Error("Failed to record");
      await fetchState();
    } catch {
      toast.error("Failed to record play");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Scorebook not available</p>
        <Button variant="ghost" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const { game, currentPA, pitches, runners, currentBatter, currentPitcher } = state;
  const balls = currentPA?.balls ?? 0;
  const strikes = currentPA?.strikes ?? 0;
  const pitchCount = pitches.length;

  // In-play flow overlay
  if (showInPlayFlow) {
    return (
      <div className="flex flex-col gap-4 px-4 py-4 max-w-lg mx-auto">
        <header className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowInPlayFlow(false)}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-lg font-bold text-gold-gradient">Ball In Play</h1>
        </header>

        {inPlayStep === "contact" && (
          <div className="rounded-xl border border-white/10 bg-[hsl(0_0%_10%)] p-4 shadow-lg">
            <h2 className="text-sm font-semibold text-gold-gradient mb-3">Contact Type</h2>
            <div className="grid grid-cols-2 gap-2">
              {CONTACT_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  className={cn(
                    "h-14 text-sm font-semibold rounded-lg border-2 transition-all",
                    selectedContact === ct.value
                      ? "border-[hsl(46_100%_50%)] bg-[hsl(46_100%_50%/0.15)] text-[hsl(46_100%_50%)]"
                      : "border-white/10 bg-[hsl(0_0%_12%)] text-white/80 hover:border-[hsl(46_100%_50%/0.4)] hover:text-white"
                  )}
                  onClick={() => handleContactSelect(ct.value)}
                >
                  {ct.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {inPlayStep === "position" && (
          <div className="rounded-xl border border-white/10 bg-[hsl(0_0%_10%)] p-4 shadow-lg">
            <h2 className="text-sm font-semibold text-gold-gradient mb-1">Fielded By</h2>
            <p className="text-xs text-white/50 mb-3">
              {selectedContact?.replace(/_/g, " ")}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {FIELDER_POSITIONS.map((pos) => (
                <button
                  key={pos.value}
                  className="h-14 text-sm font-bold rounded-lg border-2 border-white/10 bg-[hsl(0_0%_12%)] text-[hsl(46_100%_50%)] hover:border-[hsl(46_100%_50%/0.4)] hover:bg-[hsl(0_0%_14%)] transition-all"
                  onClick={() => handlePositionSelect(pos.value)}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {inPlayStep === "result" && (
          <div className="rounded-xl border border-white/10 bg-[hsl(0_0%_10%)] p-4 shadow-lg">
            <h2 className="text-sm font-semibold text-gold-gradient mb-1">Result</h2>
            <p className="text-xs text-white/50 mb-3">
              {selectedContact?.replace(/_/g, " ")} to {selectedPosition}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PLAY_RESULTS.map((pr) => (
                <button
                  key={pr.value}
                  className="h-14 text-sm font-semibold rounded-lg border-2 border-white/10 bg-[hsl(0_0%_12%)] text-white/80 hover:border-[hsl(46_100%_50%/0.4)] hover:text-white transition-all"
                  onClick={() => handlePlayResult(pr.value)}
                >
                  {pr.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-4 max-w-lg mx-auto pb-24">
      {/* Top Bar */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/games/${gameId}/hub`)}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md border border-[hsl(46_100%_50%/0.3)] bg-[hsl(46_100%_50%/0.1)] px-2 py-0.5 text-xs font-semibold text-[hsl(46_100%_50%)]">
                {game.currentHalf === "top" ? "Top" : "Bot"} {game.currentInning}
              </span>
              <OutTracker outs={game.currentOuts} />
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
              <span>
                Count: {balls}-{strikes}
              </span>
              <span>Pitches: {pitchCount}</span>
            </div>
          </div>
        </div>
        <BaseDiamond
          runners={{
            first: !!runners.first,
            second: !!runners.second,
            third: !!runners.third,
          }}
          size="sm"
        />
      </header>

      {/* Current At-Bat */}
      <div className="scoreboard-panel rounded-xl border border-white/10 bg-[hsl(0_0%_10%)] p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/50 uppercase tracking-wide">Batter</p>
            <p className="font-bold text-[hsl(46_100%_50%)] text-lg">
              {currentBatter
                ? playerFullName(currentBatter.firstName, currentBatter.lastName)
                : "---"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/50 uppercase tracking-wide">Pitcher</p>
            <p className="font-medium text-sm text-white/80">
              {currentPitcher
                ? playerFullName(currentPitcher.firstName, currentPitcher.lastName)
                : "---"}
            </p>
          </div>
        </div>
        {/* Count display using bulb system */}
        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white/50 w-4">B</span>
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className={cn(
                  "size-5 rounded-full",
                  n <= balls ? "bulb bulb-on-green" : "bulb bulb-off"
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white/50 w-4">S</span>
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={cn(
                  "size-5 rounded-full",
                  n <= strikes ? "bulb bulb-on-red" : "bulb bulb-off"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex flex-col gap-2">
        {/* Row 1: Ball, Strike, Foul */}
        <div className="grid grid-cols-3 gap-2">
          <button
            className={cn(
              "h-14 text-base font-bold rounded-lg border-2 transition-all",
              "border-green-500/30 bg-[hsl(0_0%_10%)] text-green-400",
              "hover:bg-green-500/10 hover:border-green-500/60",
              "active:bg-green-500/20",
              actionLoading && "opacity-50 pointer-events-none"
            )}
            onClick={() => recordPitch("ball")}
            disabled={actionLoading}
          >
            Ball
          </button>
          <button
            className={cn(
              "h-14 text-base font-bold rounded-lg border-2 transition-all",
              "border-red-500/30 bg-[hsl(0_0%_10%)] text-red-400",
              "hover:bg-red-500/10 hover:border-red-500/60",
              "active:bg-red-500/20",
              actionLoading && "opacity-50 pointer-events-none"
            )}
            onClick={() => recordPitch("strike_swinging")}
            disabled={actionLoading}
          >
            Strike
          </button>
          <button
            className={cn(
              "h-14 text-base font-bold rounded-lg border-2 transition-all",
              "border-[hsl(46_100%_50%/0.3)] bg-[hsl(0_0%_10%)] text-[hsl(46_100%_50%)]",
              "hover:bg-[hsl(46_100%_50%/0.1)] hover:border-[hsl(46_100%_50%/0.6)]",
              "active:bg-[hsl(46_100%_50%/0.2)]",
              actionLoading && "opacity-50 pointer-events-none"
            )}
            onClick={() => recordPitch("foul")}
            disabled={actionLoading}
          >
            Foul
          </button>
        </div>

        {/* Row 2: Single, Double, Triple, HR */}
        <div className="grid grid-cols-4 gap-2">
          <button
            className={cn(
              "h-14 text-sm font-bold rounded-lg border-2 border-white/10 bg-[hsl(0_0%_10%)] text-white/80",
              "hover:border-[hsl(46_100%_50%/0.4)] hover:text-white transition-all",
              actionLoading && "opacity-50 pointer-events-none"
            )}
            onClick={() => recordResult("single")}
            disabled={actionLoading}
          >
            1B
          </button>
          <button
            className={cn(
              "h-14 text-sm font-bold rounded-lg border-2 border-white/10 bg-[hsl(0_0%_10%)] text-white/80",
              "hover:border-[hsl(46_100%_50%/0.4)] hover:text-white transition-all",
              actionLoading && "opacity-50 pointer-events-none"
            )}
            onClick={() => recordResult("double")}
            disabled={actionLoading}
          >
            2B
          </button>
          <button
            className={cn(
              "h-14 text-sm font-bold rounded-lg border-2 border-white/10 bg-[hsl(0_0%_10%)] text-white/80",
              "hover:border-[hsl(46_100%_50%/0.4)] hover:text-white transition-all",
              actionLoading && "opacity-50 pointer-events-none"
            )}
            onClick={() => recordResult("triple")}
            disabled={actionLoading}
          >
            3B
          </button>
          <button
            className={cn(
              "h-14 text-sm font-bold rounded-lg border-2 border-[hsl(46_100%_50%/0.3)] bg-[hsl(0_0%_10%)] text-[hsl(46_100%_50%)]",
              "hover:border-[hsl(46_100%_50%/0.6)] hover:bg-[hsl(46_100%_50%/0.1)] transition-all",
              actionLoading && "opacity-50 pointer-events-none"
            )}
            onClick={() => recordResult("homerun")}
            disabled={actionLoading}
          >
            HR
          </button>
        </div>

        {/* Row 3: Walk, Strikeout, HBP */}
        <div className="grid grid-cols-3 gap-2">
          <button
            className={cn(
              "h-14 text-sm font-bold rounded-lg border-2 border-white/10 bg-[hsl(0_0%_10%)] text-white/80",
              "hover:border-[hsl(46_100%_50%/0.4)] hover:text-white transition-all",
              actionLoading && "opacity-50 pointer-events-none"
            )}
            onClick={() => recordResult("walk")}
            disabled={actionLoading}
          >
            Walk
          </button>
          <button
            className={cn(
              "h-14 text-sm font-bold rounded-lg border-2 border-white/10 bg-[hsl(0_0%_10%)] text-white/80",
              "hover:border-[hsl(46_100%_50%/0.4)] hover:text-white transition-all",
              actionLoading && "opacity-50 pointer-events-none"
            )}
            onClick={() => recordResult("strikeout")}
            disabled={actionLoading}
          >
            K
          </button>
          <button
            className={cn(
              "h-14 text-sm font-bold rounded-lg border-2 border-white/10 bg-[hsl(0_0%_10%)] text-white/80",
              "hover:border-[hsl(46_100%_50%/0.4)] hover:text-white transition-all",
              actionLoading && "opacity-50 pointer-events-none"
            )}
            onClick={() => recordResult("hbp")}
            disabled={actionLoading}
          >
            HBP
          </button>
        </div>

        {/* Row 4: Error, FC, Out, In Play */}
        <div className="grid grid-cols-4 gap-2">
          <button
            className={cn(
              "h-14 text-sm font-bold rounded-lg border-2 border-white/10 bg-[hsl(0_0%_10%)] text-white/80",
              "hover:border-[hsl(46_100%_50%/0.4)] hover:text-white transition-all",
              actionLoading && "opacity-50 pointer-events-none"
            )}
            onClick={() => recordResult("reached_on_error")}
            disabled={actionLoading}
          >
            Error
          </button>
          <button
            className={cn(
              "h-14 text-sm font-bold rounded-lg border-2 border-white/10 bg-[hsl(0_0%_10%)] text-white/80",
              "hover:border-[hsl(46_100%_50%/0.4)] hover:text-white transition-all",
              actionLoading && "opacity-50 pointer-events-none"
            )}
            onClick={() => recordResult("fc")}
            disabled={actionLoading}
          >
            FC
          </button>
          <button
            className={cn(
              "h-14 text-sm font-bold rounded-lg border-2 border-white/10 bg-[hsl(0_0%_10%)] text-white/80",
              "hover:border-[hsl(46_100%_50%/0.4)] hover:text-white transition-all",
              actionLoading && "opacity-50 pointer-events-none"
            )}
            onClick={() => recordResult("ground_out")}
            disabled={actionLoading}
          >
            Out
          </button>
          <button
            className={cn(
              "h-14 text-sm font-bold rounded-lg bg-cardinal-gradient text-white",
              "hover:opacity-90 transition-all",
              actionLoading && "opacity-50 pointer-events-none"
            )}
            onClick={handleInPlay}
            disabled={actionLoading}
          >
            In Play
          </button>
        </div>

        {/* Row 5: Undo */}
        <button
          className={cn(
            "h-11 flex items-center justify-center gap-2 rounded-lg bg-cardinal-gradient text-white font-semibold",
            "hover:opacity-90 transition-all",
            actionLoading && "opacity-50 pointer-events-none"
          )}
          onClick={handleUndo}
          disabled={actionLoading}
        >
          <Undo2 className="size-4" />
          Undo
        </button>
      </div>

      {/* Pitch Log */}
      {pitches.length > 0 && (
        <div className="scoreboard-panel rounded-xl border border-white/10 bg-[hsl(0_0%_10%)] p-4 shadow-lg">
          <h2 className="text-sm font-semibold text-gold-gradient mb-3">Pitch Log</h2>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {pitches.map((pitch, i) => {
              let color = "bg-white/10 text-white/60";
              if (pitch.pitchResult === "ball") color = "bg-green-500/20 text-green-400";
              if (pitch.pitchResult === "strike_called" || pitch.pitchResult === "strike_swinging")
                color = "bg-red-500/20 text-red-400";
              if (pitch.pitchResult === "foul") color = "bg-[hsl(46_100%_50%/0.2)] text-[hsl(46_100%_50%)]";
              if (pitch.pitchResult === "in_play") color = "bg-blue-500/20 text-blue-400";

              return (
                <span
                  key={pitch.id}
                  className={cn(
                    "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                    color
                  )}
                >
                  {i + 1}. {pitch.pitchResult.replace(/_/g, " ")}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
