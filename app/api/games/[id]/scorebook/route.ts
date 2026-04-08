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
    });

    if (!game) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      );
    }

    const plateAppearances = await prisma.plateAppearance.findMany({
      where: { gameId: id },
      include: {
        pitchEvents: { orderBy: { pitchNumber: "asc" } },
        playEvents: { orderBy: { createdAt: "asc" } },
        batter: true,
        opponentBatter: true,
        pitcher: true,
        opponentPitcher: true,
      },
      orderBy: [
        { inningNumber: "asc" },
        { half: "asc" },
        { createdAt: "asc" },
      ],
    });

    const pitchingAppearances = await prisma.pitchingAppearance.findMany({
      where: { gameId: id },
      include: { player: true },
      orderBy: { inningStart: "asc" },
    });

    return NextResponse.json({ plateAppearances, pitchingAppearances });
  } catch (error) {
    console.error("Failed to get scorebook:", error);
    return NextResponse.json(
      { error: "Failed to get scorebook data" },
      { status: 500 }
    );
  }
}

const RBI_RESULT_TYPES = [
  "single", "double", "triple", "homerun",
  "sac_fly", "ground_out", "fly_out", "fc",
];

async function getOrCreateScoreRecord(gameId: string, inningNumber: number, half: string) {
  let record = await prisma.gameScoreByInning.findUnique({
    where: {
      gameId_inningNumber_half: { gameId, inningNumber, half },
    },
  });

  if (!record) {
    record = await prisma.gameScoreByInning.create({
      data: {
        gameId,
        inningNumber,
        half,
        usRuns: 0,
        opponentRuns: 0,
        outsRecorded: 0,
        completed: false,
      },
    });
  }

  return record;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const teamId = await getTeamId();
    const { id } = await params;
    const body = await request.json();

    const game = await prisma.game.findFirst({
      where: { id, teamId },
    });

    if (!game) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      );
    }

    const pa = await prisma.plateAppearance.create({
      data: {
        gameId: id,
        inningNumber: body.inningNumber,
        half: body.half,
        battingTeam: body.battingTeam,
        batterPlayerId: body.batterPlayerId ?? null,
        batterOpponentPlayerId: body.batterOpponentPlayerId ?? null,
        battingOrderSlot: body.battingOrderSlot ?? null,
        pitcherPlayerId: body.pitcherPlayerId ?? null,
        pitcherOpponentPlayerId: body.pitcherOpponentPlayerId ?? null,
        resultType: body.resultType ?? null,
        rbiCount: body.rbiCount ?? 0,
        outsRecorded: body.outsRecorded ?? 0,
        notes: body.notes ?? null,
        sourceType: body.sourceType ?? "tap",
      },
    });

    // If resultType provided, update score and game state
    if (body.resultType) {
      const scoreRecord = await getOrCreateScoreRecord(id, body.inningNumber, body.half);
      const rbiCount = body.rbiCount ?? 0;
      const outsRecorded = body.outsRecorded ?? 0;

      // Update runs if RBI
      if (rbiCount > 0) {
        if (body.battingTeam === "us") {
          await prisma.gameScoreByInning.update({
            where: { id: scoreRecord.id },
            data: { usRuns: scoreRecord.usRuns + rbiCount },
          });
        } else {
          await prisma.gameScoreByInning.update({
            where: { id: scoreRecord.id },
            data: { opponentRuns: scoreRecord.opponentRuns + rbiCount },
          });
        }
      }

      // Update outs
      if (outsRecorded > 0) {
        await prisma.gameScoreByInning.update({
          where: { id: scoreRecord.id },
          data: { outsRecorded: scoreRecord.outsRecorded + outsRecorded },
        });

        const newOuts = game.currentOuts + outsRecorded;

        if (newOuts >= 3) {
          // Auto-advance half inning
          const nextHalf = game.currentHalf === "top" ? "bottom" : "top";
          const nextInning = game.currentHalf === "bottom"
            ? game.currentInning + 1
            : game.currentInning;

          await prisma.gameScoreByInning.update({
            where: { id: scoreRecord.id },
            data: { completed: true },
          });

          await prisma.game.update({
            where: { id },
            data: {
              currentOuts: 0,
              currentHalf: nextHalf,
              currentInning: nextInning,
            },
          });
        } else {
          await prisma.game.update({
            where: { id },
            data: { currentOuts: newOuts },
          });
        }
      }
    }

    const created = await prisma.plateAppearance.findUnique({
      where: { id: pa.id },
      include: {
        batter: true,
        opponentBatter: true,
        pitcher: true,
        opponentPitcher: true,
        pitchEvents: true,
        playEvents: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to create plate appearance:", error);
    return NextResponse.json(
      { error: "Failed to create plate appearance" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const teamId = await getTeamId();
    const { id } = await params;
    const body = await request.json();

    const game = await prisma.game.findFirst({
      where: { id, teamId },
    });

    if (!game) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      );
    }

    const { plateAppearanceId, ...fields } = body;

    if (!plateAppearanceId) {
      return NextResponse.json(
        { error: "plateAppearanceId is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.plateAppearance.findFirst({
      where: { id: plateAppearanceId, gameId: id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Plate appearance not found" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (fields.inningNumber !== undefined) data.inningNumber = fields.inningNumber;
    if (fields.half !== undefined) data.half = fields.half;
    if (fields.battingTeam !== undefined) data.battingTeam = fields.battingTeam;
    if (fields.batterPlayerId !== undefined) data.batterPlayerId = fields.batterPlayerId;
    if (fields.batterOpponentPlayerId !== undefined) data.batterOpponentPlayerId = fields.batterOpponentPlayerId;
    if (fields.battingOrderSlot !== undefined) data.battingOrderSlot = fields.battingOrderSlot;
    if (fields.pitcherPlayerId !== undefined) data.pitcherPlayerId = fields.pitcherPlayerId;
    if (fields.pitcherOpponentPlayerId !== undefined) data.pitcherOpponentPlayerId = fields.pitcherOpponentPlayerId;
    if (fields.resultType !== undefined) data.resultType = fields.resultType;
    if (fields.rbiCount !== undefined) data.rbiCount = fields.rbiCount;
    if (fields.outsRecorded !== undefined) data.outsRecorded = fields.outsRecorded;
    if (fields.notes !== undefined) data.notes = fields.notes;
    if (fields.sourceType !== undefined) data.sourceType = fields.sourceType;
    if (fields.balls !== undefined) data.balls = fields.balls;
    if (fields.strikes !== undefined) data.strikes = fields.strikes;

    const updated = await prisma.plateAppearance.update({
      where: { id: plateAppearanceId },
      data,
      include: {
        batter: true,
        opponentBatter: true,
        pitcher: true,
        opponentPitcher: true,
        pitchEvents: { orderBy: { pitchNumber: "asc" } },
        playEvents: { orderBy: { createdAt: "asc" } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update plate appearance:", error);
    return NextResponse.json(
      { error: "Failed to update plate appearance" },
      { status: 500 }
    );
  }
}
