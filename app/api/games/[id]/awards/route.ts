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

    const awards = await prisma.playerAward.findMany({
      where: { gameId: id },
      include: { player: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(awards);
  } catch (error) {
    console.error("Failed to get awards:", error);
    return NextResponse.json(
      { error: "Failed to get awards" },
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

    if (!body.awardType) {
      return NextResponse.json(
        { error: "awardType is required" },
        { status: 400 }
      );
    }

    const award = await prisma.playerAward.create({
      data: {
        gameId: id,
        playerId: body.playerId ?? null,
        awardType: body.awardType,
        headline: body.headline ?? null,
        subtext: body.subtext ?? null,
      },
      include: { player: true },
    });

    return NextResponse.json(award, { status: 201 });
  } catch (error) {
    console.error("Failed to create award:", error);
    return NextResponse.json(
      { error: "Failed to create award" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const teamId = await getTeamId();
    const { id } = await params;
    const url = new URL(request.url);
    const awardId = url.searchParams.get("id");

    if (!awardId) {
      return NextResponse.json(
        { error: "Award id query parameter is required" },
        { status: 400 }
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

    const award = await prisma.playerAward.findFirst({
      where: { id: awardId, gameId: id },
    });

    if (!award) {
      return NextResponse.json(
        { error: "Award not found" },
        { status: 404 }
      );
    }

    await prisma.playerAward.delete({ where: { id: awardId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete award:", error);
    return NextResponse.json(
      { error: "Failed to delete award" },
      { status: 500 }
    );
  }
}
