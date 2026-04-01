import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, ensureUserTeam, isCoachRole } from "@/lib/auth";

async function getTeamContext() {
  const session = await getSession();
  if (session) {
    const membership = await ensureUserTeam(session.userId);
    return { teamId: membership.team.id, role: membership.role };
  }
  return { teamId: "default-team", role: "member" };
}

export async function GET() {
  try {
    const { teamId, role } = await getTeamContext();
    const isCoach = isCoachRole(role);

    const players = await prisma.player.findMany({
      where: { teamId, active: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    // Strip rating fields for non-coach users
    if (!isCoach) {
      const sanitized = players.map((p) => ({
        id: p.id,
        teamId: p.teamId,
        firstName: p.firstName,
        lastName: p.lastName,
        dob: p.dob,
        active: p.active,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        // Hide ratings from non-coaches
        fieldingOverall: 0,
        catching: 0,
        throwing: 0,
        battingOverall: 0,
      }));
      return NextResponse.json(sanitized, {
        headers: { "X-Role": role },
      });
    }

    return NextResponse.json(players, {
      headers: { "X-Role": role },
    });
  } catch (error) {
    console.error("Failed to get players:", error);
    return NextResponse.json(
      { error: "Failed to get players" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { teamId, role } = await getTeamContext();

    // Only coaches can add players
    if (!isCoachRole(role)) {
      return NextResponse.json(
        { error: "Only coaches can add players" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { firstName, lastName, dob, fieldingOverall, catching, throwing, battingOverall } = body;

    if (!firstName || !lastName || !dob) {
      return NextResponse.json(
        { error: "firstName, lastName, and dob are required" },
        { status: 400 }
      );
    }

    const player = await prisma.player.create({
      data: {
        teamId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dob: new Date(dob),
        fieldingOverall: fieldingOverall ?? 3,
        catching: catching ?? 3,
        throwing: throwing ?? 3,
        battingOverall: battingOverall ?? 3,
      },
    });

    return NextResponse.json(player, { status: 201 });
  } catch (error) {
    console.error("Failed to create player:", error);
    return NextResponse.json(
      { error: "Failed to create player" },
      { status: 500 }
    );
  }
}
