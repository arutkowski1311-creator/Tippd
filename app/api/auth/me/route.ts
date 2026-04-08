import { NextResponse } from "next/server";
import { getSession, getUserTeam } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const membership = await getUserTeam(session.userId);

    return NextResponse.json({
      user: {
        id: session.userId,
        email: session.email,
        name: session.name,
      },
      team: membership
        ? {
            id: membership.team.id,
            name: membership.team.name,
            role: membership.role,
          }
        : null,
    });
  } catch (error) {
    console.error("Failed to get session:", error);
    return NextResponse.json(
      { error: "Failed to get session" },
      { status: 500 }
    );
  }
}
