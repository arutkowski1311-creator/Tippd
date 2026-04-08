import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateFullLineup, buildEmptyHistory } from "@/lib/lineup-engine";
import { Position, CoachMode, DefensiveFormat, POSITIONS, INFIELD_POSITIONS } from "@/lib/types";
import type { PlayerHistory } from "@/lib/types";
import { getSession, ensureUserTeam } from "@/lib/auth";

async function getTeamId(): Promise<string | null> {
  try {
    const session = await getSession();
    if (session) {
      const membership = await ensureUserTeam(session.userId);
      return membership.team.id;
    }
  } catch {
    // no session or DB error
  }
  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { playerIds, coachMode, defensiveFormat, lockedBatting, lockedFielding } = body;

    if (!Array.isArray(playerIds) || playerIds.length === 0) {
      return NextResponse.json(
        { error: "playerIds array is required" },
        { status: 400 }
      );
    }

    if (!coachMode) {
      return NextResponse.json(
        { error: "coachMode is required" },
        { status: 400 }
      );
    }

    const teamId = await getTeamId();
    if (!teamId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const game = await prisma.game.findFirst({
      where: { id, teamId },
    });

    if (!game) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      );
    }

    // Fetch player data
    const players = await prisma.player.findMany({
      where: {
        id: { in: playerIds },
        teamId,
        active: true,
      },
    });

    if (players.length === 0) {
      return NextResponse.json(
        { error: "No active players found for the given IDs" },
        { status: 400 }
      );
    }

    // Build player history from past games
    const histories = new Map<string, PlayerHistory>();

    for (const player of players) {
      const history = buildEmptyHistory(player.id);

      // Find the most recent completed game for this player's batting order
      const lastGameBatting = await prisma.gameBattingOrder.findFirst({
        where: {
          playerId: player.id,
          game: {
            teamId,
            gameStatus: "final",
            id: { not: id }, // exclude current game
          },
        },
        include: {
          game: {
            include: {
              battingOrder: {
                orderBy: { battingSlot: "asc" },
              },
            },
          },
        },
        orderBy: {
          game: { gameDate: "desc" },
        },
      });

      if (lastGameBatting) {
        history.lastBattingSlot = lastGameBatting.battingSlot;

        const allSlots = lastGameBatting.game.battingOrder;
        const maxSlot = Math.max(...allSlots.map((s) => s.battingSlot));
        history.wasLastInOrder = lastGameBatting.battingSlot === maxSlot;

        const totalPlayers = allSlots.length;
        const bottom3Threshold = totalPlayers - 3;
        history.wasInBottom3 = lastGameBatting.battingSlot > bottom3Threshold;
      }

      // Aggregate all past batting slots
      const allPastBatting = await prisma.gameBattingOrder.findMany({
        where: {
          playerId: player.id,
          game: {
            teamId,
            gameStatus: "final",
            id: { not: id },
          },
        },
      });
      history.battingSlots = allPastBatting.map((b) => b.battingSlot);

      // Aggregate position counts from all past fielding assignments
      const allFielding = await prisma.gameFieldingAssignment.findMany({
        where: {
          playerId: player.id,
          game: {
            teamId,
            id: { not: id },
          },
        },
      });

      for (const assignment of allFielding) {
        const pos = assignment.position as Position;
        if (POSITIONS.includes(pos)) {
          history.positionCounts[pos] = (history.positionCounts[pos] || 0) + 1;
        }
        if (pos === "C") {
          history.totalCatcherInnings++;
        }
        if (INFIELD_POSITIONS.includes(pos)) {
          history.totalInfieldInnings++;
        } else {
          history.totalOutfieldInnings++;
        }
      }

      // Count consecutive games caught
      const recentGamesWithCatcher = await prisma.game.findMany({
        where: {
          teamId,
          gameStatus: "final",
          id: { not: id },
        },
        orderBy: { gameDate: "desc" },
        take: 10,
        include: {
          fieldingAssignments: {
            where: {
              playerId: player.id,
              position: "C",
            },
          },
        },
      });

      let consecutiveGamesCaught = 0;
      for (const g of recentGamesWithCatcher) {
        if (g.fieldingAssignments.length > 0) {
          consecutiveGamesCaught++;
        } else {
          break;
        }
      }
      history.consecutiveGamesCaught = consecutiveGamesCaught;

      histories.set(player.id, history);
    }

    // Convert players to PlayerData format
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

    const lineup = generateFullLineup(
      playerData,
      new Date(game.gameDate),
      coachMode as CoachMode,
      (defensiveFormat || "four_outfield") as DefensiveFormat,
      histories,
      lockedBatting,
      lockedFielding
    );

    return NextResponse.json(lineup);
  } catch (error) {
    console.error("Failed to generate lineup:", error);
    return NextResponse.json(
      { error: "Failed to generate lineup" },
      { status: 500 }
    );
  }
}
