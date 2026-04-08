import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, ensureUserTeam } from "@/lib/auth";

async function getTeamId(): Promise<string> {
  const session = await getSession();
  if (session) {
    const membership = await ensureUserTeam(session.userId);
    return membership.team.id;
  }
  return "default-team"; // fallback for unauthenticated access during MVP
}

export async function GET() {
  try {
    const teamId = await getTeamId();

    const team = await prisma.team.upsert({
      where: { id: teamId },
      create: { id: teamId, name: "My Team" },
      update: {},
    });

    return NextResponse.json(team);
  } catch (error) {
    console.error("Failed to get team:", error);
    return NextResponse.json(
      { error: "Failed to get team" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Team name is required" },
        { status: 400 }
      );
    }

    const teamId = await getTeamId();

    await prisma.team.upsert({
      where: { id: teamId },
      create: { id: teamId, name: "My Team" },
      update: {},
    });

    const team = await prisma.team.update({
      where: { id: teamId },
      data: { name: name.trim() },
    });

    return NextResponse.json(team);
  } catch (error) {
    console.error("Failed to update team:", error);
    return NextResponse.json(
      { error: "Failed to update team" },
      { status: 500 }
    );
  }
}
