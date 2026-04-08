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
    const { id } = await params;
    const teamId = await getTeamId();
    if (!teamId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const game = await prisma.game.findFirst({
      where: { id, teamId },
      include: {
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
      },
    });

    if (!game) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(game);
  } catch (error) {
    console.error("Failed to get game:", error);
    return NextResponse.json(
      { error: "Failed to get game" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const teamId = await getTeamId();
    if (!teamId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const existing = await prisma.game.findFirst({
      where: { id, teamId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (body.opponentName !== undefined) data.opponentName = body.opponentName.trim();
    if (body.gameDate !== undefined) data.gameDate = new Date(body.gameDate);
    if (body.coachMode !== undefined) data.coachMode = body.coachMode;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.lineupLocked !== undefined) data.lineupLocked = body.lineupLocked;
    if (body.gameStatus !== undefined) data.gameStatus = body.gameStatus;
    if (body.currentInning !== undefined) data.currentInning = body.currentInning;
    if (body.currentHalf !== undefined) data.currentHalf = body.currentHalf;
    if (body.currentOuts !== undefined) data.currentOuts = body.currentOuts;
    if (body.homeOrAway !== undefined) data.homeOrAway = body.homeOrAway;
    if (body.venue !== undefined) data.venue = body.venue;
    if (body.defensiveFormat !== undefined) data.defensiveFormat = body.defensiveFormat;
    if (body.simpleModeEnabled !== undefined) data.simpleModeEnabled = body.simpleModeEnabled;
    if (body.advancedModeEnabled !== undefined) data.advancedModeEnabled = body.advancedModeEnabled;
    if (body.livestreamUrl !== undefined) data.livestreamUrl = body.livestreamUrl;

    const game = await prisma.game.update({
      where: { id },
      data,
    });

    return NextResponse.json(game);
  } catch (error) {
    console.error("Failed to update game:", error);
    return NextResponse.json(
      { error: "Failed to update game" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = await getTeamId();
    if (!teamId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const existing = await prisma.game.findFirst({
      where: { id, teamId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      );
    }

    await prisma.game.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete game:", error);
    return NextResponse.json(
      { error: "Failed to delete game" },
      { status: 500 }
    );
  }
}
