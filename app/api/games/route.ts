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
    // no session or team
  }
  return null;
}

export async function GET() {
  try {
    const teamId = await getTeamId();
    if (!teamId) {
      return NextResponse.json([]);
    }

    const games = await prisma.game.findMany({
      where: { teamId },
      orderBy: { gameDate: "desc" },
      include: {
        _count: {
          select: { battingOrder: true },
        },
      },
    });

    return NextResponse.json(games);
  } catch (error) {
    console.error("Failed to get games:", error);
    return NextResponse.json(
      { error: "Failed to get games" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      opponentName,
      gameDate,
      coachMode,
      notes,
      playerIds,
      homeOrAway,
      venue,
      defensiveFormat,
      simpleModeEnabled,
      advancedModeEnabled,
      livestreamUrl,
    } = body;

    if (!opponentName || !gameDate) {
      return NextResponse.json(
        { error: "opponentName and gameDate are required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(playerIds) || playerIds.length === 0) {
      return NextResponse.json(
        { error: "playerIds array is required and must not be empty" },
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

    const game = await prisma.game.create({
      data: {
        teamId,
        opponentName: opponentName.trim(),
        gameDate: new Date(gameDate),
        coachMode: coachMode || "balanced",
        notes: notes || null,
        homeOrAway: homeOrAway || null,
        venue: venue || null,
        defensiveFormat: defensiveFormat || null,
        simpleModeEnabled: simpleModeEnabled ?? undefined,
        advancedModeEnabled: advancedModeEnabled ?? undefined,
        livestreamUrl: livestreamUrl || null,
      },
    });

    return NextResponse.json(game, { status: 201 });
  } catch (error) {
    console.error("Failed to create game:", error);
    return NextResponse.json(
      { error: "Failed to create game" },
      { status: 500 }
    );
  }
}
