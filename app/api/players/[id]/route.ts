import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, ensureUserTeam, isCoachRole, isManagerRole } from "@/lib/auth";

async function getTeamContext() {
  const session = await getSession();
  if (session) {
    const membership = await ensureUserTeam(session.userId);
    return { teamId: membership.team.id, role: membership.role };
  }
  return { teamId: "default-team", role: "member" };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { teamId, role } = await getTeamContext();

    const player = await prisma.player.findFirst({
      where: { id, teamId },
    });

    if (!player) {
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 }
      );
    }

    // Strip ratings for non-managers (assistant coaches can't see ratings)
    if (!isManagerRole(role)) {
      return NextResponse.json({
        ...player,
        fieldingOverall: 0,
        catching: 0,
        throwing: 0,
        battingOverall: 0,
      });
    }

    return NextResponse.json(player);
  } catch (error) {
    console.error("Failed to get player:", error);
    return NextResponse.json(
      { error: "Failed to get player" },
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
    const { teamId, role } = await getTeamContext();

    if (!isCoachRole(role)) {
      return NextResponse.json(
        { error: "Only coaches can edit players" },
        { status: 403 }
      );
    }

    const existing = await prisma.player.findFirst({
      where: { id, teamId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (body.firstName !== undefined) data.firstName = body.firstName.trim();
    if (body.lastName !== undefined) data.lastName = body.lastName.trim();
    if (body.dob !== undefined) data.dob = new Date(body.dob);
    if (body.fieldingOverall !== undefined) data.fieldingOverall = body.fieldingOverall;
    if (body.catching !== undefined) data.catching = body.catching;
    if (body.throwing !== undefined) data.throwing = body.throwing;
    if (body.battingOverall !== undefined) data.battingOverall = body.battingOverall;
    if (body.active !== undefined) data.active = body.active;

    const player = await prisma.player.update({
      where: { id },
      data,
    });

    return NextResponse.json(player);
  } catch (error) {
    console.error("Failed to update player:", error);
    return NextResponse.json(
      { error: "Failed to update player" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { teamId, role } = await getTeamContext();

    if (!isCoachRole(role)) {
      return NextResponse.json(
        { error: "Only coaches can remove players" },
        { status: 403 }
      );
    }

    const existing = await prisma.player.findFirst({
      where: { id, teamId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 }
      );
    }

    const player = await prisma.player.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json(player);
  } catch (error) {
    console.error("Failed to delete player:", error);
    return NextResponse.json(
      { error: "Failed to delete player" },
      { status: 500 }
    );
  }
}
