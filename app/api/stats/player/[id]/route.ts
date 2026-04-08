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
    const { id: playerId } = await params;

    // Verify player belongs to team
    const player = await prisma.player.findFirst({
      where: { id: playerId, teamId },
    });

    if (!player) {
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 }
      );
    }

    // Fetch all plate appearances for this player as batter
    const plateAppearances = await prisma.plateAppearance.findMany({
      where: { batterPlayerId: playerId },
    });

    // Fetch fielding assignments
    const fieldingAssignments = await prisma.gameFieldingAssignment.findMany({
      where: {
        playerId,
        assignmentType: { in: ["actual", "planned"] },
      },
    });

    if (plateAppearances.length === 0) {
      // Fallback: simplified stats from batting order participation
      const battingOrders = await prisma.gameBattingOrder.findMany({
        where: { playerId },
      });

      const gameIds = new Set(battingOrders.map((bo) => bo.gameId));

      // Build fielding stats even without PAs
      const fieldingStats = buildFieldingStats(fieldingAssignments);

      return NextResponse.json({
        playerId,
        playerName: `${player.firstName} ${player.lastName}`,
        batting: {
          games: gameIds.size,
          plateAppearances: 0,
          atBats: 0,
          hits: 0,
          singles: 0,
          doubles: 0,
          triples: 0,
          homeRuns: 0,
          rbi: 0,
          walks: 0,
          strikeouts: 0,
          hbp: 0,
          battingAverage: 0,
          obp: 0,
          slg: 0,
          ops: 0,
        },
        fielding: fieldingStats,
      });
    }

    // Calculate batting stats
    const gameIds = new Set(plateAppearances.map((pa) => pa.gameId));

    const nonAbTypes = ["walk", "hbp", "sac_fly", "sac_bunt"];
    const hitTypes = ["single", "double", "triple", "homerun"];

    let singles = 0;
    let doubles = 0;
    let triples = 0;
    let homeRuns = 0;
    let walks = 0;
    let strikeouts = 0;
    let hbp = 0;
    let totalRbi = 0;

    for (const pa of plateAppearances) {
      switch (pa.resultType) {
        case "single": singles++; break;
        case "double": doubles++; break;
        case "triple": triples++; break;
        case "homerun": homeRuns++; break;
        case "walk": walks++; break;
        case "strikeout": strikeouts++; break;
        case "hbp": hbp++; break;
      }
      totalRbi += pa.rbiCount;
    }

    const totalPAs = plateAppearances.length;
    const atBats = plateAppearances.filter(
      (pa) => pa.resultType && !nonAbTypes.includes(pa.resultType)
    ).length;
    const hits = singles + doubles + triples + homeRuns;

    const battingAverage = atBats > 0 ? hits / atBats : 0;
    const obpDenominator = atBats + walks + hbp;
    const obp = obpDenominator > 0 ? (hits + walks + hbp) / obpDenominator : 0;
    const totalBases = singles + doubles * 2 + triples * 3 + homeRuns * 4;
    const slg = atBats > 0 ? totalBases / atBats : 0;
    const ops = obp + slg;

    // Build fielding stats
    const fieldingStats = buildFieldingStats(fieldingAssignments);

    return NextResponse.json({
      playerId,
      playerName: `${player.firstName} ${player.lastName}`,
      batting: {
        games: gameIds.size,
        plateAppearances: totalPAs,
        atBats,
        hits,
        singles,
        doubles,
        triples,
        homeRuns,
        rbi: totalRbi,
        walks,
        strikeouts,
        hbp,
        battingAverage: Math.round(battingAverage * 1000) / 1000,
        obp: Math.round(obp * 1000) / 1000,
        slg: Math.round(slg * 1000) / 1000,
        ops: Math.round(ops * 1000) / 1000,
      },
      fielding: fieldingStats,
    });
  } catch (error) {
    console.error("Failed to get player stats:", error);
    return NextResponse.json(
      { error: "Failed to get player stats" },
      { status: 500 }
    );
  }
}

function buildFieldingStats(
  assignments: { position: string; inningNumber: number; gameId: string }[]
) {
  const positionCounts: Record<string, number> = {};
  const infieldPositions = ["1B", "2B", "3B", "SS"];
  const outfieldPositions = ["LF", "CF", "RF", "LCF", "RCF"];

  let totalInnings = 0;
  let infieldInnings = 0;
  let outfieldInnings = 0;
  let catcherInnings = 0;
  let pitcherInnings = 0;

  for (const fa of assignments) {
    const pos = fa.position.toUpperCase();
    positionCounts[pos] = (positionCounts[pos] || 0) + 1;
    totalInnings++;

    if (infieldPositions.includes(pos)) {
      infieldInnings++;
    } else if (outfieldPositions.includes(pos)) {
      outfieldInnings++;
    } else if (pos === "C") {
      catcherInnings++;
    } else if (pos === "P") {
      pitcherInnings++;
    }
  }

  return {
    positionCounts,
    totalInnings,
    infieldInnings,
    outfieldInnings,
    catcherInnings,
    pitcherInnings,
  };
}
