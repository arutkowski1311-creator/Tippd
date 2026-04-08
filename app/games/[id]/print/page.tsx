"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { POSITIONS, INNINGS } from "@/lib/types";
import type { Position, GameData, PlayerData } from "@/lib/types";
import { formatDate, playerFullName } from "@/lib/utils";

interface BattingEntry {
  battingSlot: number;
  playerId: string;
  player: PlayerData;
}

interface FieldingEntry {
  inningNumber: number;
  position: string;
  playerId: string;
  player: PlayerData;
}

export default function PrintPage() {
  const router = useRouter();
  const params = useParams();
  const gameId = params.id as string;

  const [game, setGame] = useState<GameData | null>(null);
  const [battingOrder, setBattingOrder] = useState<BattingEntry[]>([]);
  const [fieldingAssignments, setFieldingAssignments] = useState<FieldingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [gameRes, lineupRes] = await Promise.all([
        fetch(`/api/games/${gameId}`),
        fetch(`/api/games/${gameId}/lineup`),
      ]);
      const gameData = await gameRes.json();
      const lineupData = await lineupRes.json();
      setGame(gameData);
      setBattingOrder(lineupData.battingOrder || []);
      setFieldingAssignments(lineupData.fieldingAssignments || []);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!loading && game) {
      // Small delay to allow render before print
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, game]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Game not found</p>
      </div>
    );
  }

  const playerMap = new Map<string, PlayerData>();
  for (const b of battingOrder) {
    if (b.player) playerMap.set(b.player.id, b.player);
  }
  for (const f of fieldingAssignments) {
    if (f.player) playerMap.set(f.player.id, f.player);
  }

  function getFieldingPlayer(inning: number, position: Position) {
    const entry = fieldingAssignments.find(
      (f) => f.inningNumber === inning && f.position === position
    );
    if (!entry) return "-";
    const player = playerMap.get(entry.playerId);
    return player ? player.firstName : "-";
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Screen-only controls */}
      <div className="no-print flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/games/${gameId}/lineup`)}>
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-xl font-bold flex-1">Print Preview</h1>
        <Button onClick={() => window.print()}>
          <Printer className="size-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Printable content */}
      <div className="print:p-0">
        {/* Header */}
        <div className="text-center mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold">
            Team vs {game.opponentName}
          </h1>
          <p className="text-lg">{formatDate(game.gameDate)}</p>
        </div>

        {/* Batting Order */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-3 border-b pb-1">Batting Order</h2>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-1 w-12">#</th>
                <th className="text-left py-1">Player</th>
              </tr>
            </thead>
            <tbody>
              {battingOrder.map((entry) => (
                <tr key={entry.battingSlot} className="border-b border-gray-200">
                  <td className="py-1.5 font-bold">{entry.battingSlot}</td>
                  <td className="py-1.5">
                    {entry.player
                      ? playerFullName(entry.player.firstName, entry.player.lastName)
                      : entry.playerId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Fielding Chart */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-3 border-b pb-1">Fielding Chart</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-300 px-2 py-1 text-left bg-gray-50 w-12">
                  Pos
                </th>
                {INNINGS.map((i) => (
                  <th key={i} className="border border-gray-300 px-2 py-1 text-center bg-gray-50">
                    {i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {POSITIONS.map((pos) => (
                <tr key={pos}>
                  <td className="border border-gray-300 px-2 py-1 font-bold bg-gray-50">
                    {pos}
                  </td>
                  {INNINGS.map((inning) => (
                    <td key={inning} className="border border-gray-300 px-2 py-1 text-center">
                      {getFieldingPlayer(inning, pos)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Page break before scorecard */}
        <div className="print-break">
          {/* Repeat header on scorecard page for context */}
          <div className="hidden print-only text-center mb-4 border-b pb-3">
            <h1 className="text-xl font-bold">
              Team vs {game.opponentName}
            </h1>
            <p className="text-sm">{formatDate(game.gameDate)}</p>
          </div>
          <h2 className="text-lg font-bold mb-3 border-b pb-1">Scorecard</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-300 px-2 py-1 text-left bg-gray-50 w-20" />
                {INNINGS.map((i) => (
                  <th key={i} className="border border-gray-300 px-3 py-1 text-center bg-gray-50">
                    {i}
                  </th>
                ))}
                <th className="border border-gray-300 px-3 py-1 text-center bg-gray-50 font-bold">
                  R
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-2 py-3 font-bold bg-gray-50">
                  Us
                </td>
                {INNINGS.map((i) => (
                  <td key={i} className="border border-gray-300 px-3 py-3 text-center" />
                ))}
                <td className="border border-gray-300 px-3 py-3 text-center" />
              </tr>
              <tr>
                <td className="border border-gray-300 px-2 py-3 font-bold bg-gray-50">
                  {game.opponentName}
                </td>
                {INNINGS.map((i) => (
                  <td key={i} className="border border-gray-300 px-3 py-3 text-center" />
                ))}
                <td className="border border-gray-300 px-3 py-3 text-center" />
              </tr>
              <tr>
                <td className="border border-gray-300 px-2 py-3 font-bold bg-gray-50">
                  Outs
                </td>
                {INNINGS.map((i) => (
                  <td key={i} className="border border-gray-300 px-3 py-3 text-center" />
                ))}
                <td className="border border-gray-300 px-3 py-3 text-center" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
