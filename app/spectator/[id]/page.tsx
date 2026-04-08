"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Loader2, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreDisplay } from "@/components/softball/score-display";
import { BaseDiamond } from "@/components/softball/base-diamond";
import { OutTracker } from "@/components/softball/out-tracker";
import { formatDate } from "@/lib/utils";
import type {
  GameData,
  ScoreByInning,
  RunnersState,
} from "@/lib/types";

interface SpectatorData {
  game: GameData;
  scoreByInning: ScoreByInning[];
  totalUsRuns: number;
  totalOppRuns: number;
  recentPlays: { id: string; description: string; inning: number; createdAt: string }[];
  runners: RunnersState | null;
}

export default function SpectatorPage() {
  const params = useParams();
  const gameId = params.id as string;

  const [data, setData] = useState<SpectatorData | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function fetchData() {
    fetch(`/api/games/${gameId}/hub`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [gameId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Game not found</p>
      </div>
    );
  }

  const { game, scoreByInning, totalUsRuns, totalOppRuns, recentPlays, runners } = data;
  const isLive = game.gameStatus === "live";
  const isFinal = game.gameStatus === "final";
  const parsedRunners: RunnersState = runners ?? { first: null, second: null, third: null };

  return (
    <div className="flex flex-col gap-4 px-4 py-6 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-lg font-bold">vs {game.opponentName}</h1>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="text-sm text-muted-foreground">{formatDate(game.gameDate)}</span>
          <Badge variant={isLive ? "default" : isFinal ? "secondary" : "outline"}>
            {isLive ? "Live" : isFinal ? "Final" : "Scheduled"}
          </Badge>
        </div>
      </div>

      {/* Score */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-10">
            <div className="text-center">
              <p className="text-sm text-muted-foreground font-medium">Us</p>
              <p className="text-5xl font-bold tabular-nums">{totalUsRuns}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                {isLive
                  ? `${game.currentHalf === "top" ? "Top" : "Bot"} ${game.currentInning}`
                  : isFinal
                    ? "Final"
                    : "Scheduled"}
              </p>
              {isLive && (
                <div className="flex flex-col items-center gap-2 mt-2">
                  <OutTracker outs={game.currentOuts} size="lg" />
                  <BaseDiamond
                    runners={{
                      first: !!parsedRunners.first,
                      second: !!parsedRunners.second,
                      third: !!parsedRunners.third,
                    }}
                    size="lg"
                  />
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground font-medium">
                {game.opponentName.length > 10
                  ? game.opponentName.slice(0, 10) + "..."
                  : game.opponentName}
              </p>
              <p className="text-5xl font-bold tabular-nums">{totalOppRuns}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inning-by-Inning */}
      <Card>
        <CardContent className="py-4">
          <ScoreDisplay
            scoreByInning={scoreByInning}
            opponentName={game.opponentName}
            currentInning={isLive ? game.currentInning : undefined}
          />
        </CardContent>
      </Card>

      {/* Recent Plays */}
      {recentPlays.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Plays</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {recentPlays.slice(0, 10).map((play) => (
                <div
                  key={play.id}
                  className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0"
                >
                  <span className="text-xs font-bold text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0">
                    {play.inning}
                  </span>
                  <p className="text-sm">{play.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recap */}
      {game.recapText && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Game Recap</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{game.recapText}</p>
          </CardContent>
        </Card>
      )}

      {/* Livestream */}
      {game.livestreamUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Video className="size-4" />
              Livestream
            </CardTitle>
          </CardHeader>
          <CardContent>
            {game.livestreamUrl.includes("youtube") || game.livestreamUrl.includes("youtu.be") ? (
              <div className="aspect-video rounded-lg overflow-hidden">
                <iframe
                  src={game.livestreamUrl.replace("watch?v=", "embed/")}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            ) : (
              <a
                href={game.livestreamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Video className="size-4" />
                Watch Livestream
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {/* Auto-refresh indicator */}
      {isLive && (
        <p className="text-center text-xs text-muted-foreground">
          Auto-refreshing every 10 seconds
        </p>
      )}
    </div>
  );
}
