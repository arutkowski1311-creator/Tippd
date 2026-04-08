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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const teamId = await getTeamId();
    const { id } = await params;
    const body = await request.json();

    const { plateAppearanceId, pitchResult } = body;

    if (!plateAppearanceId || !pitchResult) {
      return NextResponse.json(
        { error: "plateAppearanceId and pitchResult are required" },
        { status: 400 }
      );
    }

    const validResults = [
      "ball", "strike_called", "strike_swinging", "foul", "in_play", "hbp",
    ];

    if (!validResults.includes(pitchResult)) {
      return NextResponse.json(
        { error: `Invalid pitchResult. Must be one of: ${validResults.join(", ")}` },
        { status: 400 }
      );
    }

    // Verify game belongs to team
    const game = await prisma.game.findFirst({
      where: { id, teamId },
    });

    if (!game) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      );
    }

    // Get the plate appearance
    const pa = await prisma.plateAppearance.findFirst({
      where: { id: plateAppearanceId, gameId: id },
    });

    if (!pa) {
      return NextResponse.json(
        { error: "Plate appearance not found" },
        { status: 404 }
      );
    }

    // Get next pitch number
    const lastPitch = await prisma.pitchEvent.findFirst({
      where: { plateAppearanceId },
      orderBy: { pitchNumber: "desc" },
    });
    const pitchNumber = (lastPitch?.pitchNumber ?? 0) + 1;

    // Create pitch event
    await prisma.pitchEvent.create({
      data: {
        plateAppearanceId,
        pitchNumber,
        pitchResult,
      },
    });

    // Update ball/strike count and determine result
    let { balls, strikes } = pa;
    let resultType = pa.resultType;

    switch (pitchResult) {
      case "ball":
        balls++;
        if (balls >= 4) {
          resultType = "walk";
        }
        break;

      case "strike_called":
      case "strike_swinging":
        strikes++;
        if (strikes >= 3) {
          resultType = "strikeout";
        }
        break;

      case "foul":
        if (strikes < 2) {
          strikes++;
        }
        // foul with 2 strikes does not change count
        break;

      case "in_play":
        // Count doesn't change; result will be set separately
        break;

      case "hbp":
        resultType = "hbp";
        break;
    }

    // Update the plate appearance
    await prisma.plateAppearance.update({
      where: { id: plateAppearanceId },
      data: { balls, strikes, resultType },
    });

    // Update pitcher's pitching appearance pitchesThrown
    const pitcherId = pa.pitcherPlayerId ?? pa.pitcherOpponentPlayerId;
    if (pitcherId) {
      // Find the active pitching appearance for this pitcher in this game
      const pitchingAppearance = await prisma.pitchingAppearance.findFirst({
        where: {
          gameId: id,
          OR: [
            { playerId: pa.pitcherPlayerId ?? undefined },
            { opponentPlayerId: pa.pitcherOpponentPlayerId ?? undefined },
          ],
          inningEnd: null,
        },
        orderBy: { inningStart: "desc" },
      });

      if (pitchingAppearance) {
        await prisma.pitchingAppearance.update({
          where: { id: pitchingAppearance.id },
          data: { pitchesThrown: pitchingAppearance.pitchesThrown + 1 },
        });
      }
    }

    // Return updated PA with pitch events
    const updatedPA = await prisma.plateAppearance.findUnique({
      where: { id: plateAppearanceId },
      include: {
        batter: true,
        opponentBatter: true,
        pitcher: true,
        opponentPitcher: true,
        pitchEvents: { orderBy: { pitchNumber: "asc" } },
        playEvents: { orderBy: { createdAt: "asc" } },
      },
    });

    return NextResponse.json(updatedPA);
  } catch (error) {
    console.error("Failed to record pitch:", error);
    return NextResponse.json(
      { error: "Failed to record pitch" },
      { status: 500 }
    );
  }
}
