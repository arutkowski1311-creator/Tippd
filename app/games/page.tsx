"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatDate } from "@/lib/utils";
import type { GameData, GameStatus } from "@/lib/types";

function statusVariant(status: GameStatus) {
  switch (status) {
    case "live":
      return "default" as const;
    case "final":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function statusLabel(status: GameStatus) {
  switch (status) {
    case "live":
      return "Live";
    case "final":
      return "Final";
    default:
      return "Scheduled";
  }
}

function StatusBadge({ status }: { status: GameStatus }) {
  switch (status) {
    case "live":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-900/60 px-2.5 py-0.5 text-xs font-semibold text-red-300 ring-1 ring-red-500/40 shadow-[0_0_8px_hsl(0_100%_50%/0.3)]">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-red-500" />
          </span>
          Live
        </span>
      );
    case "final":
      return (
        <span className="inline-flex items-center rounded-full bg-gold-dim/15 px-2.5 py-0.5 text-xs font-semibold text-gold-dim ring-1 ring-gold-dim/30">
          Final
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-muted/50 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground ring-1 ring-border/50">
          Scheduled
        </span>
      );
  }
}

function gameHref(game: GameData) {
  return `/games/${game.id}/hub`;
}

export default function GamesPage() {
  const [games, setGames] = useState<GameData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/games")
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setGames(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-6 max-w-lg mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gold-gradient">
          Games
        </h1>
        <Button
          size="sm"
          className="bg-cardinal-gradient text-gold font-semibold hover:opacity-90 transition-opacity"
          render={<Link href="/games/new" />}
        >
          <Plus className="size-4 mr-1" />
          New Game
        </Button>
      </header>

      {games.length === 0 ? (
        <EmptyState
          title="No games yet"
          description="Create your first game to generate lineups."
          action={
            <Button
              className="bg-cardinal-gradient text-gold font-semibold hover:opacity-90 transition-opacity"
              render={<Link href="/games/new" />}
            >
              New Game
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-0 divide-y divide-border/40">
          {games.map((game) => (
            <Link key={game.id} href={gameHref(game)} className="block">
              <Card
                className={cn(
                  "card-glow rounded-none border-x border-y-0 border-border/30 bg-card/60 backdrop-blur-sm transition-all hover:bg-card/80 card-bg-image card-bg-scoreboard",
                  "first:rounded-t-lg first:border-t last:rounded-b-lg last:border-b",
                  game.gameStatus === "live" &&
                    "ring-1 ring-red-500/20 shadow-[0_0_12px_hsl(0_100%_50%/0.1)]"
                )}
              >
                <CardContent className="flex items-center gap-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate text-foreground">
                        vs {game.opponentName}
                      </p>
                      {game.homeOrAway && (
                        <span
                          className={cn(
                            "inline-flex items-center justify-center size-5 rounded text-[10px] font-bold shrink-0",
                            game.homeOrAway === "home"
                              ? "bg-cardinal/20 text-cardinal-bright"
                              : "bg-gold/15 text-gold-dim"
                          )}
                        >
                          {game.homeOrAway === "home" ? "H" : "A"}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(game.gameDate)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <StatusBadge status={game.gameStatus} />
                    {game.gameStatus === "final" &&
                      game.finalTeamScore !== null &&
                      game.finalOpponentScore !== null && (
                        <span className="font-mono text-sm font-bold tracking-wider text-gold">
                          {game.finalTeamScore}&ndash;{game.finalOpponentScore}
                        </span>
                      )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
