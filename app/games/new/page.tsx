"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckSquare, Square, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import type { PlayerData, CoachMode, DefensiveFormat, HomeOrAway } from "@/lib/types";
import { playerFullName } from "@/lib/utils";
import { cn } from "@/lib/utils";

const COACH_MODES: { value: CoachMode; title: string; description: string }[] = [
  {
    value: "development",
    title: "Development",
    description: "Prioritize equal playing time and position variety for all players.",
  },
  {
    value: "balanced",
    title: "Balanced",
    description: "Mix of fairness and competitive positioning. Good for most games.",
  },
  {
    value: "win-now",
    title: "Win Now",
    description: "Put your strongest players in key positions. For tournament play.",
  },
];

export default function NewGamePage() {
  const router = useRouter();
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [opponentName, setOpponentName] = useState("");
  const [gameDate, setGameDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");
  const [coachMode, setCoachMode] = useState<CoachMode>("balanced");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(
    new Set()
  );
  const [homeOrAway, setHomeOrAway] = useState<HomeOrAway>("home");
  const [venue, setVenue] = useState("");
  const [defensiveFormat, setDefensiveFormat] = useState<DefensiveFormat>("four_outfield");
  const [simpleModeEnabled, setSimpleModeEnabled] = useState(true);
  const [advancedModeEnabled, setAdvancedModeEnabled] = useState(false);
  const [livestreamUrl, setLivestreamUrl] = useState("");
  const [showLivestream, setShowLivestream] = useState(false);

  useEffect(() => {
    fetch("/api/players")
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        setPlayers(data);
        setSelectedPlayerIds(new Set(data.map((p: PlayerData) => p.id)));
      })
      .catch(() => toast.error("Failed to load players"))
      .finally(() => setLoading(false));
  }, []);

  function togglePlayer(id: string) {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedPlayerIds(new Set(players.map((p) => p.id)));
  }

  async function handleSubmit() {
    if (!opponentName.trim()) {
      toast.error("Opponent name is required");
      return;
    }
    if (selectedPlayerIds.size < 7) {
      toast.error("Select at least 7 players");
      return;
    }

    setSubmitting(true);
    try {
      const playerIds = Array.from(selectedPlayerIds);

      // Create game
      const createRes = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opponentName,
          gameDate,
          coachMode,
          notes: notes || null,
          playerIds,
          homeOrAway,
          venue: venue || null,
          defensiveFormat,
          simpleModeEnabled,
          advancedModeEnabled,
          livestreamUrl: livestreamUrl || null,
        }),
      });
      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error || "Failed to create game");
      }
      const game = await createRes.json();

      // Generate lineup
      const genRes = await fetch(`/api/games/${game.id}/lineup/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerIds, coachMode, defensiveFormat }),
      });
      if (!genRes.ok) {
        const err = await genRes.json().catch(() => ({}));
        console.error("Lineup generate error:", err);
        throw new Error(err.error || "Failed to generate lineup");
      }
      const lineup = await genRes.json();

      // Save lineup
      const saveRes = await fetch(`/api/games/${game.id}/lineup`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          battingOrder: lineup.battingOrder,
          fieldingAssignments: lineup.fieldingAssignments,
        }),
      });
      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({}));
        console.error("Lineup save error:", err);
        throw new Error(err.error || "Failed to save lineup");
      }

      toast.success("Game created with lineup!");
      router.push(`/games/${game.id}/hub`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create game");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-lg mx-auto">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/games")}>
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-xl font-extrabold tracking-tight text-gold-gradient">New Game</h1>
      </header>

      {/* Opponent */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gold-dim">Opponent Name *</label>
        <Input
          value={opponentName}
          onChange={(e) => setOpponentName(e.target.value)}
          placeholder="e.g. Thunder Bolts"
          className="bg-white/5 border-white/10 focus:border-gold/40"
        />
      </div>

      {/* Date */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gold-dim">Game Date</label>
        <Input
          type="date"
          value={gameDate}
          onChange={(e) => setGameDate(e.target.value)}
          className="bg-white/5 border-white/10 focus:border-gold/40"
        />
      </div>

      {/* Home/Away */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gold-dim">Home or Away</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setHomeOrAway("home")}
            className={cn(
              "flex items-center justify-center rounded-xl border-2 p-3 font-semibold text-base transition-colors",
              homeOrAway === "home"
                ? "border-cardinal bg-cardinal/10 text-gold shadow-[0_0_12px_hsl(0_100%_30%/0.2)]"
                : "border-border hover:border-cardinal/30"
            )}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => setHomeOrAway("away")}
            className={cn(
              "flex items-center justify-center rounded-xl border-2 p-3 font-semibold text-base transition-colors",
              homeOrAway === "away"
                ? "border-cardinal bg-cardinal/10 text-gold shadow-[0_0_12px_hsl(0_100%_30%/0.2)]"
                : "border-border hover:border-cardinal/30"
            )}
          >
            Away
          </button>
        </div>
      </div>

      {/* Venue */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gold-dim">Venue (optional)</label>
        <Input
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          placeholder="e.g. Central Park Field 3"
          className="bg-white/5 border-white/10 focus:border-gold/40"
        />
      </div>

      {/* Defensive Format */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gold-dim">Defensive Format</label>
        <div className="grid gap-2">
          {([
            { value: "standard" as DefensiveFormat, title: "3 Outfielders (Standard)", description: "LF, CF, RF - standard defensive alignment" },
            { value: "four_outfield" as DefensiveFormat, title: "4 Outfielders", description: "LF, LC, RC, RF - extra coverage in the outfield" },
            { value: "five_outfield" as DefensiveFormat, title: "5 Outfielders", description: "LF, LCF, CF, RCF, RF - maximum outfield coverage" },
          ]).map((fmt) => (
            <button
              key={fmt.value}
              type="button"
              onClick={() => setDefensiveFormat(fmt.value)}
              className={cn(
                "flex flex-col gap-1 rounded-xl border-2 p-4 text-left transition-colors",
                defensiveFormat === fmt.value
                  ? "border-cardinal bg-cardinal/10 shadow-[0_0_12px_hsl(0_100%_30%/0.2)]"
                  : "border-border hover:border-cardinal/30"
              )}
            >
              <p className="font-semibold">{fmt.title}</p>
              <p className="text-sm text-muted-foreground">{fmt.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Scoring Mode */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gold-dim">Scoring Mode</label>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setSimpleModeEnabled(!simpleModeEnabled)}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="text-left">
              <p className="font-semibold">Simple</p>
              <p className="text-sm text-muted-foreground">Track score, outs, and innings</p>
            </div>
            <div
              className={cn(
                "w-11 h-6 rounded-full transition-colors relative",
                simpleModeEnabled ? "bg-cardinal" : "bg-muted"
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
                  simpleModeEnabled ? "translate-x-[22px]" : "translate-x-0.5"
                )}
              />
            </div>
          </button>
          <button
            type="button"
            onClick={() => setAdvancedModeEnabled(!advancedModeEnabled)}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="text-left">
              <p className="font-semibold">Advanced Scorebook</p>
              <p className="text-sm text-muted-foreground">Pitch-by-pitch tracking with full stats</p>
            </div>
            <div
              className={cn(
                "w-11 h-6 rounded-full transition-colors relative",
                advancedModeEnabled ? "bg-cardinal" : "bg-muted"
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
                  advancedModeEnabled ? "translate-x-[22px]" : "translate-x-0.5"
                )}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Livestream URL */}
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setShowLivestream(!showLivestream)}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {showLivestream ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          Livestream URL (optional)
        </button>
        {showLivestream && (
          <Input
            value={livestreamUrl}
            onChange={(e) => setLivestreamUrl(e.target.value)}
            placeholder="https://youtube.com/live/..."
            className="bg-white/5 border-white/10 focus:border-gold/40"
          />
        )}
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gold-dim">Notes (optional)</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Location, time, etc."
          className="min-h-[60px] bg-white/5 border-white/10 focus:border-gold/40"
        />
      </div>

      {/* Coach Mode */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gold-dim">Coach Mode</label>
        <div className="grid gap-2">
          {COACH_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => setCoachMode(mode.value)}
              className={cn(
                "flex flex-col gap-1 rounded-xl border-2 p-4 text-left transition-colors",
                coachMode === mode.value
                  ? "border-cardinal bg-cardinal/10 shadow-[0_0_12px_hsl(0_100%_30%/0.2)]"
                  : "border-border hover:border-cardinal/30"
              )}
            >
              <p className="font-semibold">{mode.title}</p>
              <p className="text-sm text-muted-foreground">{mode.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Player Selection */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gold-dim">
            Players ({selectedPlayerIds.size} selected)
          </label>
          <Button variant="ghost" size="sm" onClick={selectAll}>
            Select All
          </Button>
        </div>
        <div className="flex flex-col gap-1 max-h-[40vh] overflow-y-auto rounded-lg border border-white/10 bg-white/5 p-2">
          {players.map((player) => {
            const isSelected = selectedPlayerIds.has(player.id);

            return (
              <button
                key={player.id}
                type="button"
                onClick={() => togglePlayer(player.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                  isSelected
                    ? "bg-gold/5"
                    : "hover:bg-muted/50"
                )}
              >
                {isSelected ? (
                  <CheckSquare className="size-5 text-gold shrink-0" />
                ) : (
                  <Square className="size-5 text-muted-foreground shrink-0" />
                )}
                <span className="flex-1 font-medium truncate">
                  {playerFullName(player.firstName, player.lastName)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !opponentName.trim() || selectedPlayerIds.size < 7}
        className={cn(
          "w-full h-12 text-base font-bold rounded-xl transition-all",
          "bg-cardinal-gradient border border-cardinal-bright/30",
          "text-white shadow-lg shadow-cardinal/20",
          "hover:shadow-[0_0_24px_hsl(0_100%_30%/0.4)] hover:brightness-110",
          "active:scale-[0.98]",
          "disabled:opacity-50 disabled:pointer-events-none"
        )}
      >
        {submitting ? "Creating..." : "Create Game & Generate Lineup"}
      </button>
    </div>
  );
}
