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

export async function GET(request: Request) {
  try {
    const teamId = await getTeamId();
    const url = new URL(request.url);
    const gameId = url.searchParams.get("gameId");
    const playerId = url.searchParams.get("playerId");
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    const where: Record<string, unknown> = { teamId };
    if (gameId) where.gameId = gameId;
    if (playerId) where.playerId = playerId;

    const mediaItems = await prisma.mediaItem.findMany({
      where,
      include: {
        game: { select: { id: true, opponentName: true, gameDate: true } },
        player: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(mediaItems);
  } catch (error) {
    console.error("Failed to get media items:", error);
    return NextResponse.json(
      { error: "Failed to get media items" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const teamId = await getTeamId();
    const session = await getSession();
    const body = await request.json();

    if (!body.mediaType || !body.storageKey) {
      return NextResponse.json(
        { error: "mediaType and storageKey are required" },
        { status: 400 }
      );
    }

    const mediaItem = await prisma.mediaItem.create({
      data: {
        teamId,
        gameId: body.gameId ?? null,
        playerId: body.playerId ?? null,
        uploaderUserId: session?.userId ?? null,
        mediaType: body.mediaType,
        storageKey: body.storageKey,
        caption: body.caption ?? null,
        visibility: body.visibility ?? "team",
      },
      include: {
        game: { select: { id: true, opponentName: true, gameDate: true } },
        player: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(mediaItem, { status: 201 });
  } catch (error) {
    console.error("Failed to create media item:", error);
    return NextResponse.json(
      { error: "Failed to create media item" },
      { status: 500 }
    );
  }
}
