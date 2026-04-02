"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trophy, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { playerFullName, playerAge, formatDate } from "@/lib/utils";
import type {
  PlayerData,
  PlayerSeasonStats,
  PlayerAwardData,
  Position,
} from "@/lib/types";

interface PlayerProfileData {
  player: PlayerData;
  stats: PlayerSeasonStats;
  awards: PlayerAwardData[];
  gameLog: {
    gameId: string;
    opponentName: string;
    gameDate: string;
    hits: number;
    atBats: number;
    rbi: number;
    runs: number;
  }[];
}

const RATING_LABELS = ["Fielding", "Catching", "Throwing", "Batting"] as const;

function RatingDots({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className={cn(
              "size-3 rounded-full",
              n <= value ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>
    </div>
  );
}

export default function PlayerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const playerId = params.id as string;

  const [data, setData] = useState<PlayerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCoach, setIsCoach] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const role = d?.role ?? "";
        setIsCoach(["head_coach", "assistant_coach", "admin"].includes(role));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`/api/players/${playerId}`).then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      }),
      fetch(`/api/stats/player/${playerId}`).then((r) => {
        if (!r.ok) return null;
        return r.json();
      }),
    ])
      .then(([playerData, statsData]) => {
        setData({
          player: playerData.player ?? playerData,
          stats: statsData?.stats ?? statsData ?? {
            batting: {
              games: 0, plateAppearances: 0, atBats: 0, runs: 0, hits: 0,
              singles: 0, doubles: 0, triples: 0, homeRuns: 0, rbi: 0,
              walks: 0, strikeouts: 0, hbp: 0, battingAverage: 0, obp: 0, slg: 0, ops: 0,
            },
            fielding: { innings: {} as Record<Position, number>, totalInnings: 0, infieldInnings: 0, outfieldInnings: 0, catcherInnings: 0, pitcherInnings: 0 },
            pitching: { appearances: 0, inningsPitched: 0, pitchesThrown: 0, strikeouts: 0, walks: 0, hitsAllowed: 0, runsAllowed: 0 },
          },
          awards: statsData?.awards ?? [],
          gameLog: statsData?.gameLog ?? [],
        });
      })
      .catch(() => toast.error("Failed to load player"))
      .finally(() => setLoading(false));
  }, [playerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Player not found</p>
        <Button variant="ghost" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const { player, stats, awards, gameLog } = data;
  const age = player.dob ? playerAge(player.dob) : null;

  return (
    <div className="flex flex-col gap-4 px-4 py-4 max-w-lg mx-auto pb-24">
      {/* Header */}
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-lg font-bold">Player Profile</h1>
      </header>

      {/* Player Info */}
      <div className="flex items-center gap-4">
        <div className="size-20 rounded-full bg-muted flex items-center justify-center shrink-0">
          {player.profileImageUrl ? (
            <img
              src={player.profileImageUrl}
              alt={playerFullName(player.firstName, player.lastName)}
              className="size-20 rounded-full object-cover"
            />
          ) : (
            <User className="size-8 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold">
            {playerFullName(player.firstName, player.lastName)}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            {player.jerseyNumber && (
              <Badge variant="outline">#{player.jerseyNumber}</Badge>
            )}
            {age !== null && (
              <span className="text-sm text-muted-foreground">Age {age}</span>
            )}
          </div>
        </div>
      </div>

      {/* Ratings — coaches only */}
      {isCoach && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-around">
              <RatingDots value={player.fieldingOverall} label="Fielding" />
              <RatingDots value={player.catching} label="Catching" />
              <RatingDots value={player.throwing} label="Throwing" />
              <RatingDots value={player.battingOverall} label="Batting" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Season Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Season Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <StatCell label="AVG" value={stats.batting.battingAverage.toFixed(3)} />
            <StatCell label="Hits" value={String(stats.batting.hits)} />
            <StatCell label="RBI" value={String(stats.batting.rbi)} />
            <StatCell label="Runs" value={String(stats.batting.runs)} />
            <StatCell label="BB" value={String(stats.batting.walks)} />
            <StatCell label="K" value={String(stats.batting.strikeouts)} />
            <StatCell label="2B" value={String(stats.batting.doubles)} />
            <StatCell label="3B" value={String(stats.batting.triples)} />
            <StatCell label="HR" value={String(stats.batting.homeRuns)} />
          </div>
        </CardContent>
      </Card>

      {/* Position History */}
      {stats.fielding.totalInnings > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Position History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {Object.entries(stats.fielding.innings)
                .filter(([, inn]) => inn > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([pos, inn]) => (
                  <div key={pos} className="flex items-center gap-3">
                    <span className="text-xs font-bold w-8">{pos}</span>
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${Math.round((inn / stats.fielding.totalInnings) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-6 text-right">
                      {inn}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Game Log */}
      {gameLog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Game Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              <div className="grid grid-cols-5 text-[10px] font-medium text-muted-foreground uppercase px-1 pb-1">
                <span className="col-span-2">Game</span>
                <span className="text-center">H</span>
                <span className="text-center">RBI</span>
                <span className="text-center">R</span>
              </div>
              {gameLog.map((g) => (
                <button
                  key={g.gameId}
                  type="button"
                  onClick={() => router.push(`/games/${g.gameId}/hub`)}
                  className="grid grid-cols-5 items-center rounded-lg px-1 py-2 text-sm hover:bg-muted/50 transition-colors"
                >
                  <div className="col-span-2 truncate text-left">
                    <span className="font-medium">vs {g.opponentName}</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      {formatDate(g.gameDate)}
                    </span>
                  </div>
                  <span className="text-center font-mono">
                    {g.hits}/{g.atBats}
                  </span>
                  <span className="text-center font-mono">{g.rbi}</span>
                  <span className="text-center font-mono">{g.runs}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Awards */}
      {awards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="size-4" />
              Awards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {awards.map((award) => (
                <div
                  key={award.id}
                  className="flex items-center gap-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 p-3"
                >
                  <Trophy className="size-5 text-yellow-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">
                      {award.headline || award.awardType.replace(/_/g, " ")}
                    </p>
                    {award.subtext && (
                      <p className="text-xs text-muted-foreground">{award.subtext}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-lg bg-muted/50 p-2">
      <span className="text-lg font-bold tabular-nums">{value}</span>
      <span className="text-[10px] font-medium text-muted-foreground uppercase">
        {label}
      </span>
    </div>
  );
}
