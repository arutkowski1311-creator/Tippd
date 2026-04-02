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

    const battingOrder = await prisma.gameBattingOrder.findMany({
      where: { gameId: id },
      include: { player: true },
      orderBy: { battingSlot: "asc" },
    });

    const fieldingAssignments = await prisma.gameFieldingAssignment.findMany({
      where: { gameId: id },
      include: { player: true },
      orderBy: [{ inningNumber: "asc" }, { position: "asc" }],
    });

    return NextResponse.json({
      battingOrder,
      fieldingAssignments,
      lineupLocked: game.lineupLocked,
    });
  } catch (error) {
    console.error("Failed to get lineup:", error);
    return NextResponse.json(
      { error: "Failed to get lineup" },
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
    const { battingOrder, fieldingAssignments, lineupLocked } = body;
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

    await prisma.$transaction(async (tx) => {
      // Replace batting order
      if (Array.isArray(battingOrder) && battingOrder.length > 0) {
        await tx.gameBattingOrder.deleteMany({ where: { gameId: id } });
        await tx.gameBattingOrder.createMany({
          data: battingOrder.map((entry: { battingSlot: number; playerId: string }) => ({
            gameId: id,
            battingSlot: entry.battingSlot,
            playerId: entry.playerId,
          })),
        });
      }

      // Replace fielding assignments
      if (Array.isArray(fieldingAssignments) && fieldingAssignments.length > 0) {
        await tx.gameFieldingAssignment.deleteMany({ where: { gameId: id } });
        await tx.gameFieldingAssignment.createMany({
          data: fieldingAssignments.map((entry: { inningNumber: number; position: string; playerId: string; assignmentType?: string }) => ({
            gameId: id,
            inningNumber: entry.inningNumber,
            position: entry.position,
            playerId: entry.playerId,
            assignmentType: entry.assignmentType || "planned",
          })),
        });
      }

      // Update lineupLocked if provided
      if (lineupLocked !== undefined) {
        await tx.game.update({
          where: { id },
          data: { lineupLocked },
        });
      }
    });

    // Return the updated lineup
    const updatedBatting = await prisma.gameBattingOrder.findMany({
      where: { gameId: id },
      include: { player: true },
      orderBy: { battingSlot: "asc" },
    });

    const updatedFielding = await prisma.gameFieldingAssignment.findMany({
      where: { gameId: id },
      include: { player: true },
      orderBy: [{ inningNumber: "asc" }, { position: "asc" }],
    });

    const updatedGame = await prisma.game.findUnique({
      where: { id },
    });

    return NextResponse.json({
      battingOrder: updatedBatting,
      fieldingAssignments: updatedFielding,
      lineupLocked: updatedGame?.lineupLocked,
    });
  } catch (error) {
    console.error("Failed to save lineup:", error);
    return NextResponse.json(
      { error: "Failed to save lineup", details: String(error) },
      { status: 500 }
    );
  }
}
