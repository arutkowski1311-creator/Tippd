import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, ensureUserTeam } from "@/lib/auth";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const membership = await ensureUserTeam(session.userId);
    if (membership.role !== "head_coach") {
      return NextResponse.json({ error: "Only head coach can clear games" }, { status: 403 });
    }

    const teamId = membership.team.id;

    // Delete all games for this team (cascades delete batting orders, fielding, etc.)
    const deleted = await prisma.game.deleteMany({
      where: { teamId },
    });

    return NextResponse.json({
      message: `Deleted ${deleted.count} games`,
      count: deleted.count,
    });
  } catch (error) {
    console.error("Failed to clear games:", error);
    return NextResponse.json(
      { error: "Failed to clear games", details: String(error) },
      { status: 500 }
    );
  }
}
