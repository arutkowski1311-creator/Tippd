"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ListOrdered,
  Radio,
  BookOpen,
  Printer,
  Trophy,
  Plus,
  ImageIcon,
  Video,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreDisplay } from "@/components/softball/score-display";
import { BaseDiamond } from "@/components/softball/base-diamond";
import { OutTracker } from "@/components/softball/out-tracker";
import { formatDate, playerFullName } from "@/lib/utils";
import type {
  GameData,
  PlayerData,
  BattingOrderEntry,
  FieldingAssignment,
  ScoreByInning,
  PlayerAwardData,
  MediaItemData,
  RunnersState,
} from "@/lib/types";

interface HubData {
  game: GameData;
  players: PlayerData[];
  battingOrder: BattingOrderEntry[];
  fieldingAssignments: FieldingAssignment[];
  scoreByInning: ScoreByInning[];
  totalUsRuns: number;
  totalOppRuns: number;
  recentPlays: { id: string; description: string; inning: number; createdAt: string }[];
  awards: PlayerAwardData[];
  media: MediaItemData[];
  runners: RunnersState | null;
}

export default function GameHubPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;

  const [data, setData] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingRecap, setGeneratingRecap] = useState(false);

  useEffect(() => {
    fetch(`/api/games/${gameId}/hub`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load game");
        return res.json();
      })
      .then((d) => setData(d))
      .catch(() => toast.error("Failed to load game"))
      .finally(() => setLoading(false));
  }, [gameId]);

  async function generateRecap() {
    setGeneratingRecap(true);
    try {
      const res = await fetch(`/api/games/${gameId}/recap`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate recap");
      const result = await res.json();
      setData((prev) =>
        prev
          ? {
              ...prev,
              game: { ...prev.game, recapText: result.recapText, recapStatus: "complete" },
            }
          : prev
      );
      toast.success("Recap generated!");
    } catch {
      toast.error("Failed to generate recap");
    } finally {
      setGeneratingRecap(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-gold/50" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Game not found</p>
        <Button variant="ghost" onClick={() => router.push("/games")}>
          Back to Games
        </Button>
      </div>
    );
  }

  const { game, players, battingOrder, fieldingAssignments, scoreByInning, totalUsRuns, totalOppRuns, recentPlays, awards, media, runners } = data;
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const isLive = game.gameStatus === "live";
  const isFinal = game.gameStatus === "final";

  function statusColor() {
    if (isLive) return "default";
    if (isFinal) return "secondary";
    return "outline";
  }

  function statusLabel() {
    if (isLive) return "Live";
    if (isFinal) return "Final";
    return "Scheduled";
  }

  const parsedRunners: RunnersState = runners ?? { first: null, second: null, third: null };

  return (
    <div className="flex flex-col gap-4 px-4 py-4 max-w-lg mx-auto pb-24">
      {/* Header */}
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-gold/70 hover:text-gold hover:bg-gold/10" onClick={() => router.push("/games")}>
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-extrabold tracking-tight truncate text-gold-gradient">
              vs {game.opponentName}
            </h1>
            <Badge
              variant={statusColor()}
              className={cn(
                "uppercase text-[10px] font-bold tracking-wider",
                isLive && "bg-red-600/20 text-red-400 border-red-500/30 shadow-[0_0_8px_hsl(0_100%_50%/0.3)]",
                isFinal && "bg-gold/10 text-gold border-gold/30 shadow-[0_0_8px_hsl(46_100%_50%/0.2)]",
                !isLive && !isFinal && "bg-white/5 text-white/40 border-white/10"
              )}
            >
              {statusLabel()}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{formatDate(game.gameDate)}</span>
            <Badge variant="outline" className="text-xs border-gold/20 text-gold/60">
              {game.homeOrAway === "home" ? "HOME" : "AWAY"}
            </Badge>
          </div>
        </div>
      </header>

      {/* Score Section */}
      {(isLive || isFinal) && (
        <div className="rounded-xl overflow-hidden border border-[hsl(0_0%_20%)]" style={{
          background: "linear-gradient(180deg, hsl(0 0% 10%) 0%, hsl(0 0% 6%) 100%)",
          boxShadow: "inset 0 1px 0 hsl(0 0% 18% / 0.4), 0 2px 8px hsl(0 0% 0% / 0.5)",
        }}>
          {/* Scoreboard header bar */}
          <div className="flex items-center justify-between px-4 py-1.5 border-b border-[hsl(0_0%_18%)]" style={{
            background: "linear-gradient(180deg, hsl(0 0% 14%) 0%, hsl(0 0% 10%) 100%)",
          }}>
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[hsl(0_0%_50%)]">Scoreboard</span>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-[0.15em]",
              isLive ? "text-red-400" : "text-[hsl(0_0%_50%)]"
            )}>
              {isLive
                ? `${game.currentHalf === "top" ? "TOP" : "BOT"} ${game.currentInning}`
                : "FINAL"}
            </span>
          </div>
          {/* Score area */}
          <div className="flex items-center justify-center gap-10 px-5 py-5">
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(46_60%_55%)] mb-2">Us</p>
              <p className="text-5xl font-mono font-black tabular-nums" style={{
                color: "hsl(46 80% 60%)",
                textShadow: "0 0 6px hsl(46 80% 50% / 0.3)",
              }}>{totalUsRuns}</p>
            </div>
            <div className="text-center">
              {isLive && (
                <div className="flex items-center justify-center gap-3">
                  <OutTracker outs={game.currentOuts} size="sm" />
                  <BaseDiamond
                    runners={{
                      first: !!parsedRunners.first,
                      second: !!parsedRunners.second,
                      third: !!parsedRunners.third,
                    }}
                    size="sm"
                  />
                </div>
              )}
              {!isLive && (
                <div className="w-px h-12 bg-[hsl(0_0%_20%)]" />
              )}
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(0_0%_55%)] mb-2">
                {game.opponentName.slice(0, 8).toUpperCase()}
              </p>
              <p className="text-5xl font-mono font-black tabular-nums" style={{
                color: "hsl(0 0% 75%)",
                textShadow: "0 0 4px hsl(0 0% 50% / 0.2)",
              }}>{totalOppRuns}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 border-gold/20 bg-white/[0.03] text-gold/80 hover:bg-gold/10 hover:text-gold hover:border-gold/40 transition-all"
          onClick={() => router.push(`/games/${gameId}/lineup`)}
        >
          <ListOrdered className="size-4 mr-1" />
          Lineup
        </Button>
        {(isLive || game.simpleModeEnabled) && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-gold/20 bg-white/[0.03] text-gold/80 hover:bg-gold/10 hover:text-gold hover:border-gold/40 transition-all"
            onClick={() => router.push(`/games/${gameId}/live`)}
          >
            <Radio className="size-4 mr-1" />
            Live Score
          </Button>
        )}
        {game.advancedModeEnabled && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-gold/20 bg-white/[0.03] text-gold/80 hover:bg-gold/10 hover:text-gold hover:border-gold/40 transition-all"
            onClick={() => router.push(`/games/${gameId}/scorebook`)}
          >
            <BookOpen className="size-4 mr-1" />
            Scorebook
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 border-gold/20 bg-white/[0.03] text-gold/80 hover:bg-gold/10 hover:text-gold hover:border-gold/40 transition-all"
          onClick={() => window.print()}
        >
          <Printer className="size-4 mr-1" />
          Print
        </Button>
      </div>

      {/* Tabbed Content */}
      {/* Batting Order */}
      <div>
        <h3 className="text-sm font-bold text-gold/80 uppercase tracking-wider mb-2">Batting Order</h3>
        {battingOrder.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No lineup set yet.</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {battingOrder
              .sort((a, b) => a.battingSlot - b.battingSlot)
              .map((entry) => {
                const player = playerMap.get(entry.playerId);
                return (
                  <div
                    key={entry.battingSlot}
                    className="flex items-center gap-3 rounded-lg bg-[hsl(0_0%_10%)] border border-[hsl(0_0%_16%)] px-3 py-2"
                  >
                    <span className="text-sm font-bold text-gold/60 w-6 text-center font-mono">
                      {entry.battingSlot}
                    </span>
                    <span className="flex-1 text-sm font-medium text-white/90 truncate">
                      {player
                        ? playerFullName(player.firstName, player.lastName)
                        : "Unknown"}
                    </span>
                    {player?.jerseyNumber && (
                      <span className="text-xs text-gold/40 font-mono">
                        #{player.jerseyNumber}
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Fielding - Inning 1 */}
      {fieldingAssignments.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gold/80 uppercase tracking-wider mb-2">Fielding - Inning 1</h3>
          <div className="grid grid-cols-3 gap-1.5">
            {fieldingAssignments
              .filter((a) => a.inningNumber === 1)
              .map((a) => {
                const player = playerMap.get(a.playerId);
                return (
                  <div
                    key={`${a.position}`}
                    className="flex items-center gap-2 rounded-lg bg-[hsl(0_0%_10%)] border border-[hsl(0_0%_16%)] px-2.5 py-2"
                  >
                    <span className="text-[10px] font-bold text-gold/60 uppercase tracking-wider w-6">
                      {a.position}
                    </span>
                    <span className="text-xs font-medium truncate text-white/80">
                      {player ? player.firstName : "-"}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Go Live / Start Game Button */}
      {!isLive && !isFinal && (
        <Button
          className="w-full bg-cardinal-gradient border border-cardinal-bright/30 text-white font-bold text-base min-h-[48px] shadow-lg shadow-cardinal/20 hover:opacity-90 active:scale-[0.97] transition-all"
          onClick={() => router.push(`/games/${gameId}/live`)}
        >
          <Radio className="size-5 mr-2" />
          Start Game
        </Button>
      )}
      {isLive && (
        <Button
          className="w-full bg-cardinal-gradient border border-cardinal-bright/30 text-white font-bold text-base min-h-[48px] shadow-lg shadow-cardinal/20 hover:opacity-90 active:scale-[0.97] transition-all animate-pulse"
          onClick={() => router.push(`/games/${gameId}/live`)}
        >
          <Radio className="size-5 mr-2" />
          Go Live
        </Button>
      )}

      {/* Recap */}
      <Card className="border-gold/10 bg-white/[0.02] transition-all">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2 text-gold-gradient">
            <Sparkles className="size-4 text-gold" />
            Game Recap
          </CardTitle>
        </CardHeader>
        <CardContent>
          {game.recapText ? (
            <p className="text-sm leading-relaxed text-white/80">{game.recapText}</p>
          ) : (
            <div className="flex flex-col items-center gap-3 py-2">
              <p className="text-sm text-muted-foreground">No recap available yet.</p>
              <Button
                variant="outline"
                size="sm"
                className="border-gold/20 text-gold/80 hover:bg-gold/10 hover:text-gold"
                onClick={generateRecap}
                disabled={generatingRecap}
              >
                {generatingRecap ? (
                  <>
                    <Loader2 className="size-4 mr-1 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Recap"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Awards */}
      <Card className="border-gold/10 bg-white/[0.02] transition-all">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2 text-gold-gradient">
            <Trophy className="size-4 text-gold" />
            Awards
          </CardTitle>
        </CardHeader>
        <CardContent>
          {awards.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              No awards yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {awards.map((award) => {
                const player = award.player ?? (award.playerId ? playerMap.get(award.playerId) : null);
                return (
                  <div
                    key={award.id}
                    className="flex flex-col items-center gap-1 rounded-lg bg-gold/5 border border-gold/20 p-3"
                  >
                    <Trophy className="size-5 text-gold" />
                    <span className="text-xs font-bold text-center text-gold/90">
                      {award.headline || award.awardType.replace(/_/g, " ")}
                    </span>
                    {player && (
                      <span className="text-xs text-white/50">
                        {playerFullName(player.firstName, player.lastName)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Media */}
      <Card className="border-gold/10 bg-white/[0.02] transition-all">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2 text-gold-gradient">
            <ImageIcon className="size-4 text-gold" />
            Media
          </CardTitle>
        </CardHeader>
        <CardContent>
          {media.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              No photos or videos yet.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {media.map((item) => (
                <div
                  key={item.id}
                  className="aspect-square rounded-lg bg-white/[0.03] border border-gold/10 flex items-center justify-center overflow-hidden"
                >
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.caption || "Game media"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="size-6 text-gold/30" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Livestream */}
      {game.livestreamUrl && (
        <Card className="border-gold/10 bg-white/[0.02] transition-all">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-gold-gradient">
              <Video className="size-4 text-gold" />
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
    </div>
  );
}
