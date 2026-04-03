"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RatingInput } from "@/components/softball/rating-input";
import type { PlayerData } from "@/lib/types";
import { playerFullName, playerAge } from "@/lib/utils";

export default function RatingWizardPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCoach, setIsCoach] = useState<boolean | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ratings, setRatings] = useState<Record<string, {
    fieldingOverall: number;
    catching: number;
    throwing: number;
    battingOverall: number;
  }>>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const role = d?.team?.role ?? "";
        const manager = ["head_coach", "admin"].includes(role);
        setIsCoach(manager);
        if (!manager) router.push("/roster");
      })
      .catch(() => router.push("/roster"));
  }, [router]);

  useEffect(() => {
    if (isCoach === false) return;
    fetch("/api/players")
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        // Filter to players with default ratings (all 3s)
        const defaultPlayers = data.filter(
          (p) =>
            p.fieldingOverall === 3 &&
            p.catching === 3 &&
            p.throwing === 3 &&
            p.battingOverall === 3
        );
        const toRate = defaultPlayers.length > 0 ? defaultPlayers : data;
        setPlayers(toRate);
        const initialRatings: typeof ratings = {};
        for (const p of toRate) {
          initialRatings[p.id] = {
            fieldingOverall: p.fieldingOverall,
            catching: p.catching,
            throwing: p.throwing,
            battingOverall: p.battingOverall,
          };
        }
        setRatings(initialRatings);
      })
      .catch(() => toast.error("Failed to load players"))
      .finally(() => setLoading(false));
  }, []);

  const savePlayer = useCallback(async (playerId: string, playerRatings: {
    fieldingOverall: number;
    catching: number;
    throwing: number;
    battingOverall: number;
  }) => {
    try {
      await fetch(`/api/players/${playerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(playerRatings),
      });
    } catch {
      toast.error("Failed to save ratings");
    }
  }, []);

  function updateRating(field: string, value: number) {
    const player = players[currentIndex];
    if (!player) return;

    const updated = { ...ratings[player.id], [field]: value };
    setRatings((prev) => ({ ...prev, [player.id]: updated }));

    // Debounced save
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      savePlayer(player.id, updated);
    }, 1000);
  }

  async function goNext() {
    const player = players[currentIndex];
    if (player && ratings[player.id]) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      await savePlayer(player.id, ratings[player.id]);
    }

    if (currentIndex < players.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      toast.success("All players rated!");
      router.push("/roster");
    }
  }

  function goPrev() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 px-4">
        <p className="text-muted-foreground">No players to rate</p>
        <Button onClick={() => router.push("/roster")}>Go to Roster</Button>
      </div>
    );
  }

  const player = players[currentIndex];
  const currentRatings = ratings[player.id] || {
    fieldingOverall: 3,
    catching: 3,
    throwing: 3,
    battingOverall: 3,
  };
  const isLast = currentIndex === players.length - 1;

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-lg mx-auto min-h-screen">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/roster")}>
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Rate Players</h1>
          <p className="text-sm text-muted-foreground">
            {currentIndex + 1} of {players.length}
          </p>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 rounded-full"
          style={{ width: `${((currentIndex + 1) / players.length) * 100}%` }}
        />
      </div>

      {/* Player info */}
      <div className="text-center py-4">
        <h2 className="text-2xl font-bold">
          {playerFullName(player.firstName, player.lastName)}
        </h2>
        <p className="text-muted-foreground">Age {playerAge(player.dob)}</p>
      </div>

      {/* Rating inputs */}
      <div className="flex flex-col gap-6">
        <RatingInput
          label="Fielding"
          value={currentRatings.fieldingOverall}
          onChange={(v) => updateRating("fieldingOverall", v)}
        />
        <RatingInput
          label="Catching"
          value={currentRatings.catching}
          onChange={(v) => updateRating("catching", v)}
        />
        <RatingInput
          label="Throwing"
          value={currentRatings.throwing}
          onChange={(v) => updateRating("throwing", v)}
        />
        <RatingInput
          label="Batting"
          value={currentRatings.battingOverall}
          onChange={(v) => updateRating("battingOverall", v)}
        />
      </div>

      {/* Navigation */}
      <div className="mt-auto pt-6 flex gap-2">
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="flex-1 h-12"
        >
          <ArrowLeft className="size-4 mr-1" />
          Previous
        </Button>
        <Button onClick={goNext} className="flex-1 h-12">
          {isLast ? (
            <>
              <Check className="size-4 mr-1" />
              Done
            </>
          ) : (
            <>
              Next
              <ArrowRight className="size-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
