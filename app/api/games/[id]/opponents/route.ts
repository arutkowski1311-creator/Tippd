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

    const opponents = await prisma.opponentGamePlayer.findMany({
      where: { gameId: id },
      orderBy: { lineupSlot: "asc" },
    });

    return NextResponse.json(opponents);
  } catch (error) {
    console.error("Failed to get opponent players:", error);
    return NextResponse.json(
      { error: "Failed to get opponent players" },
      { status: 500 }
    );
  }
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

    const opponent = await prisma.opponentGamePlayer.create({
      data: {
        gameId: id,
        jerseyNumber: body.jerseyNumber ?? null,
        name: body.name ?? null,
        lineupSlot: body.lineupSlot ?? null,
        currentPosition: body.currentPosition ?? null,
      },
    });

    return NextResponse.json(opponent, { status: 201 });
  } catch (error) {
    console.error("Failed to create opponent player:", error);
    return NextResponse.json(
      { error: "Failed to create opponent player" },
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

    if (!body.id) {
      return NextResponse.json(
        { error: "Opponent player id is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.opponentGamePlayer.findFirst({
      where: { id: body.id, gameId: id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Opponent player not found" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (body.jerseyNumber !== undefined) data.jerseyNumber = body.jerseyNumber;
    if (body.name !== undefined) data.name = body.name;
    if (body.lineupSlot !== undefined) data.lineupSlot = body.lineupSlot;
    if (body.currentPosition !== undefined) data.currentPosition = body.currentPosition;
    if (body.notes !== undefined) data.notes = body.notes;

    const updated = await prisma.opponentGamePlayer.update({
      where: { id: body.id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update opponent player:", error);
    return NextResponse.json(
      { error: "Failed to update opponent player" },
      { status: 500 }
    );
  }
}
