import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const teamId = await getTeamId();
    if (!teamId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { id } = await params;

    const game = await prisma.game.findFirst({
      where: { id, teamId },
      include: {
        team: { select: { name: true } },
        battingOrder: {
          include: { player: true },
          orderBy: { battingSlot: "asc" },
        },
        fieldingAssignments: {
          include: { player: true },
          orderBy: [{ inningNumber: "asc" }, { position: "asc" }],
        },
        scoreByInning: {
          orderBy: [{ inningNumber: "asc" }, { half: "asc" }],
        },
        events: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        awards: {
          include: { player: true },
        },
        mediaItems: {
          where: { visibility: "team" },
          take: 20,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!game) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      );
    }

    // Build players list from batting order and fielding
    const playerMap = new Map<string, typeof game.battingOrder[0]["player"]>();
    for (const b of game.battingOrder) {
      if (b.player) playerMap.set(b.player.id, b.player);
    }
    for (const f of game.fieldingAssignments) {
      if (f.player) playerMap.set(f.player.id, f.player);
    }

    // Calculate total runs
    let totalUsRuns = 0;
    let totalOppRuns = 0;
    for (const s of game.scoreByInning) {
      totalUsRuns += s.usRuns;
      totalOppRuns += s.opponentRuns;
    }

    // Parse runners
    let runners = null;
    if (game.runnersJson) {
      try { runners = JSON.parse(game.runnersJson); } catch { /* ignore */ }
    }

    // Format response to match HubData interface
    return NextResponse.json({
      game: {
        id: game.id,
        teamId: game.teamId,
        opponentName: game.opponentName,
        gameDate: game.gameDate,
        homeOrAway: game.homeOrAway,
        venue: game.venue,
        notes: game.notes,
        gameStatus: game.gameStatus,
        coachMode: game.coachMode,
        lineupLocked: game.lineupLocked,
        simpleModeEnabled: game.simpleModeEnabled,
        advancedModeEnabled: game.advancedModeEnabled,
        currentInning: game.currentInning,
        currentHalf: game.currentHalf,
        currentOuts: game.currentOuts,
        finalTeamScore: game.finalTeamScore,
        finalOpponentScore: game.finalOpponentScore,
        livestreamUrl: game.livestreamUrl,
        recapText: game.recapText,
        recapStatus: game.recapStatus,
      },
      players: Array.from(playerMap.values()),
      battingOrder: game.battingOrder,
      fieldingAssignments: game.fieldingAssignments,
      scoreByInning: game.scoreByInning,
      totalUsRuns,
      totalOppRuns,
      recentPlays: game.events.map((e) => ({
        id: e.id,
        description: e.payloadJson ? JSON.parse(e.payloadJson).description || e.eventType : e.eventType,
        inning: e.inningNumber,
        createdAt: e.createdAt.toISOString(),
      })),
      awards: game.awards,
      media: game.mediaItems,
      runners,
    });
  } catch (error) {
    console.error("Failed to get game hub:", error);
    return NextResponse.json(
      { error: "Failed to get game hub data" },
      { status: 500 }
    );
  }
}
