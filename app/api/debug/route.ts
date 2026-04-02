import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, ensureUserTeam } from "@/lib/auth";
import { generateFullLineup, buildEmptyHistory } from "@/lib/lineup-engine";
import { CoachMode, DefensiveFormat } from "@/lib/types";

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Test DB connection
  try {
    const count = await prisma.player.count();
    results.dbConnection = "OK";
    results.playerCount = count;
  } catch (e) {
    results.dbConnection = "FAILED: " + String(e);
    return NextResponse.json(results);
  }

  // 2. Test auth
  try {
    const session = await getSession();
    results.session = session ? { userId: session.userId, email: session.email } : "no session";
    if (session) {
      const membership = await ensureUserTeam(session.userId);
      results.teamId = membership.team.id;
      results.role = membership.role;
    }
  } catch (e) {
    results.auth = "FAILED: " + String(e);
  }

  // 3. Test lineup generation with first available game
  try {
    const game = await prisma.game.findFirst({
      orderBy: { createdAt: "desc" },
    });
    if (game) {
      results.latestGame = { id: game.id, opponent: game.opponentName, format: game.defensiveFormat };

      const players = await prisma.player.findMany({
        where: { teamId: game.teamId, active: true },
      });
      results.activePlayers = players.length;

      if (players.length > 0) {
        const playerData = players.map((p) => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          dob: p.dob.toISOString(),
          fieldingOverall: p.fieldingOverall,
          catching: p.catching,
          throwing: p.throwing,
          battingOverall: p.battingOverall,
          active: p.active,
          teamId: p.teamId,
        }));

        const histories = new Map();
        for (const p of players) {
          histories.set(p.id, buildEmptyHistory(p.id));
        }

        const lineup = generateFullLineup(
          playerData,
          new Date(game.gameDate),
          (game.coachMode || "balanced") as CoachMode,
          (game.defensiveFormat || "standard") as DefensiveFormat,
          histories
        );

        results.lineupGenerated = true;
        results.battingOrderCount = lineup.battingOrder.length;
        results.fieldingCount = lineup.fieldingAssignments.length;
      }
    } else {
      results.latestGame = "none";
    }
  } catch (e) {
    results.lineupGeneration = "FAILED: " + String(e);
  }

  return NextResponse.json(results);
}
