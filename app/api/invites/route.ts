import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, ensureUserTeam } from "@/lib/auth";

async function requireCoach() {
  const session = await getSession();
  if (!session) {
    return { error: "Not authenticated", status: 401 };
  }

  const membership = await ensureUserTeam(session.userId);
  const isCoachOrAdmin = ["head_coach", "assistant_coach", "admin"].includes(
    membership.role
  );

  if (!isCoachOrAdmin) {
    return { error: "Only coaches and admins can manage invites", status: 403 };
  }

  return { session, membership };
}

// GET: List all invites for the team
export async function GET() {
  try {
    const auth = await requireCoach();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const invites = await prisma.invite.findMany({
      where: { teamId: auth.membership.teamId },
      include: {
        linkedPlayer: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invites);
  } catch (error) {
    console.error("Failed to list invites:", error);
    return NextResponse.json(
      { error: "Failed to list invites" },
      { status: 500 }
    );
  }
}

// POST: Create a new invite
export async function POST(request: Request) {
  try {
    const auth = await requireCoach();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { email, role, linkedPlayerId } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const validRoles = [
      "head_coach",
      "assistant_coach",
      "scorekeeper",
      "parent",
    ];
    const assignedRole = validRoles.includes(role) ? role : "parent";

    // Check for existing pending invite for this email on this team
    const existingInvite = await prisma.invite.findFirst({
      where: {
        teamId: auth.membership.teamId,
        email: email.toLowerCase(),
        status: "pending",
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: "A pending invite already exists for this email" },
        { status: 409 }
      );
    }

    // If linkedPlayerId provided, verify the player belongs to the team
    if (linkedPlayerId) {
      const player = await prisma.player.findFirst({
        where: { id: linkedPlayerId, teamId: auth.membership.teamId },
      });
      if (!player) {
        return NextResponse.json(
          { error: "Player not found on this team" },
          { status: 404 }
        );
      }
    }

    const invite = await prisma.invite.create({
      data: {
        teamId: auth.membership.teamId,
        email: email.toLowerCase(),
        role: assignedRole,
        invitedByUserId: auth.session.userId,
        linkedPlayerId: linkedPlayerId || null,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
      include: {
        linkedPlayer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(invite, { status: 201 });
  } catch (error) {
    console.error("Failed to create invite:", error);
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    );
  }
}

// DELETE: Revoke an invite
export async function DELETE(request: Request) {
  try {
    const auth = await requireCoach();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const inviteId = searchParams.get("id");

    if (!inviteId) {
      return NextResponse.json(
        { error: "Invite id is required" },
        { status: 400 }
      );
    }

    const invite = await prisma.invite.findFirst({
      where: { id: inviteId, teamId: auth.membership.teamId },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 }
      );
    }

    if (invite.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending invites can be revoked" },
        { status: 400 }
      );
    }

    await prisma.invite.update({
      where: { id: inviteId },
      data: { status: "revoked" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to revoke invite:", error);
    return NextResponse.json(
      { error: "Failed to revoke invite" },
      { status: 500 }
    );
  }
}
