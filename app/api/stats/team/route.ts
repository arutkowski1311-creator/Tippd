import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, ensureUserTeam } from "@/lib/auth";

async function getTeamId(): Promise<string> {
  const session = await getSession();
  if (session) {
    const membership = await ensureUserTeam(session.userId);
    return membership.team.id;
  }
  return "default-team";
}

export async function GET() {
  try {
    const teamId = await getTeamId();

    // Get all finalized games for the team
    const games = await prisma.game.findMany({
      where: { teamId, gameStatus: "final" },
      include: {
        scoreByInning: true,
      },
    });

    const totalGames = games.length;
    let wins = 0;
    let losses = 0;
    let ties = 0;
    let totalRunsScored = 0;
    let totalRunsAllowed = 0;

    for (const game of games) {
      let usRuns = game.finalTeamScore ?? 0;
      let oppRuns = game.finalOpponentScore ?? 0;

      // If final scores not set, calculate from innings
      if (game.finalTeamScore === null || game.finalOpponentScore === null) {
        usRuns = 0;
        oppRuns = 0;
        for (const score of game.scoreByInning) {
          usRuns += score.usRuns;
          oppRuns += score.opponentRuns;
        }
      }

      totalRunsScored += usRuns;
      totalRunsAllowed += oppRuns;

      if (usRuns > oppRuns) {
        wins++;
      } else if (usRuns < oppRuns) {
        losses++;
      } else {
        ties++;
      }
    }

    const runsPerGame = totalGames > 0
      ? Math.round((totalRunsScored / totalGames) * 100) / 100
      : 0;

    return NextResponse.json({
      teamId,
      totalGames,
      wins,
      losses,
      ties,
      totalRunsScored,
      totalRunsAllowed,
      runsPerGame,
    });
  } catch (error) {
    console.error("Failed to get team stats:", error);
    return NextResponse.json(
      { error: "Failed to get team stats" },
      { status: 500 }
    );
  }
}
