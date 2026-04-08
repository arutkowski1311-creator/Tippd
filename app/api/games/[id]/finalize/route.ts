import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, ensureUserTeam } from "@/lib/auth";

async function getTeamId(): Promise<string> {
  const session = await getSession();
  if (session) {
    const membership = await ensureUserTeam(session.userId);
    return membership.team.id;
  }
  return "default-team"; // fallback for unauthenticated access during MVP
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = await getTeamId();

    const game = await prisma.game.findFirst({
      where: { id, teamId },
      include: {
        scoreByInning: true,
      },
    });

    if (!game) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      );
    }

    if (game.gameStatus === "final") {
      return NextResponse.json(
        { error: "Game is already finalized" },
        { status: 400 }
      );
    }

    // Calculate final scores from score-by-inning records
    let finalTeamScore = 0;
    let finalOpponentScore = 0;

    for (const score of game.scoreByInning) {
      finalTeamScore += score.usRuns;
      finalOpponentScore += score.opponentRuns;
    }

    const finalizedGame = await prisma.game.update({
      where: { id },
      data: {
        gameStatus: "final",
        finalTeamScore,
        finalOpponentScore,
        finalizedAt: new Date(),
      },
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

    return NextResponse.json(finalizedGame);
  } catch (error) {
    console.error("Failed to finalize game:", error);
    return NextResponse.json(
      { error: "Failed to finalize game" },
      { status: 500 }
    );
  }
}
