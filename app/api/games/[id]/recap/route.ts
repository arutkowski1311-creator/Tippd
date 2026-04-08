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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const teamId = await getTeamId();
    const { id } = await params;

    const game = await prisma.game.findFirst({
      where: { id, teamId },
      select: {
        id: true,
        recapText: true,
        recapStatus: true,
      },
    });

    if (!game) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      recapText: game.recapText,
      recapStatus: game.recapStatus,
    });
  } catch (error) {
    console.error("Failed to get recap:", error);
    return NextResponse.json(
      { error: "Failed to get recap" },
      { status: 500 }
    );
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const teamId = await getTeamId();
    const { id } = await params;

    const game = await prisma.game.findFirst({
      where: { id, teamId },
      include: {
        team: { select: { name: true } },
        scoreByInning: {
          orderBy: [{ inningNumber: "asc" }, { half: "asc" }],
        },
        battingOrder: {
          include: { player: true },
          orderBy: { battingSlot: "asc" },
        },
        plateAppearances: {
          where: { battingTeam: "us" },
          include: { batter: true },
        },
        events: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!game) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      );
    }

    // Build structured recap
    const teamName = game.team.name;
    const opponent = game.opponentName;

    // Calculate final scores
    let totalUsRuns = 0;
    let totalOppRuns = 0;
    for (const score of game.scoreByInning) {
      totalUsRuns += score.usRuns;
      totalOppRuns += score.opponentRuns;
    }

    const usScore = game.finalTeamScore ?? totalUsRuns;
    const oppScore = game.finalOpponentScore ?? totalOppRuns;
    const won = usScore > oppScore;
    const tied = usScore === oppScore;
    const resultWord = won ? "defeated" : tied ? "tied" : "fell to";

    // Headline
    const headline = `${teamName} ${resultWord} ${opponent} ${usScore}-${oppScore}`;

    // Scoring summary by inning
    const scoringLines: string[] = [];
    for (const score of game.scoreByInning) {
      const runs = score.usRuns + score.opponentRuns;
      if (runs > 0) {
        const parts: string[] = [];
        if (score.usRuns > 0) parts.push(`${teamName} ${score.usRuns}`);
        if (score.opponentRuns > 0) parts.push(`${opponent} ${score.opponentRuns}`);
        scoringLines.push(
          `${score.half === "top" ? "Top" : "Bottom"} ${score.inningNumber}: ${parts.join(", ")}`
        );
      }
    }

    // Notable batting stats from plate appearances
    const playerHits: Record<string, { name: string; hits: number; rbi: number }> = {};
    const hitTypes = ["single", "double", "triple", "homerun"];

    for (const pa of game.plateAppearances) {
      if (pa.resultType && hitTypes.includes(pa.resultType) && pa.batter) {
        const name = `${pa.batter.firstName} ${pa.batter.lastName}`;
        if (!playerHits[name]) {
          playerHits[name] = { name, hits: 0, rbi: 0 };
        }
        playerHits[name].hits++;
        playerHits[name].rbi += pa.rbiCount;
      }
    }

    const notableStats = Object.values(playerHits)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 5)
      .map((p) => {
        const rbiText = p.rbi > 0 ? `, ${p.rbi} RBI` : "";
        return `${p.name}: ${p.hits} hit${p.hits !== 1 ? "s" : ""}${rbiText}`;
      });

    // Build recap text
    const sections: string[] = [headline, ""];

    if (scoringLines.length > 0) {
      sections.push("Scoring Summary:");
      sections.push(...scoringLines);
      sections.push("");
    }

    if (notableStats.length > 0) {
      sections.push("Notable Performances:");
      sections.push(...notableStats);
      sections.push("");
    }

    sections.push(`Final: ${teamName} ${usScore}, ${opponent} ${oppScore}`);

    const recapText = sections.join("\n");

    // Save recap to game
    await prisma.game.update({
      where: { id },
      data: {
        recapText,
        recapStatus: "complete",
      },
    });

    // Create RecapJob record
    await prisma.recapJob.create({
      data: {
        gameId: id,
        status: "complete",
        resultText: recapText,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      recapText,
      recapStatus: "complete",
    });
  } catch (error) {
    console.error("Failed to generate recap:", error);
    return NextResponse.json(
      { error: "Failed to generate recap" },
      { status: 500 }
    );
  }
}
