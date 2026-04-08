import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET: Validate an invite token (public — used by signup page)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    const invite = await prisma.invite.findUnique({
      where: { token },
      include: {
        team: { select: { name: true } },
        linkedPlayer: { select: { firstName: true, lastName: true } },
      },
    });

    if (!invite) {
      return NextResponse.json(
        { valid: false, error: "Invalid invite link" },
        { status: 404 }
      );
    }

    if (invite.status !== "pending") {
      return NextResponse.json({
        valid: false,
        error: "This invite has already been used or revoked",
      });
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json({
        valid: false,
        error: "This invite has expired",
      });
    }

    return NextResponse.json({
      valid: true,
      email: invite.email,
      role: invite.role,
      teamName: invite.team.name,
      linkedPlayer: invite.linkedPlayer
        ? `${invite.linkedPlayer.firstName} ${invite.linkedPlayer.lastName}`
        : null,
    });
  } catch (error) {
    console.error("Failed to validate invite:", error);
    return NextResponse.json(
      { error: "Failed to validate invite" },
      { status: 500 }
    );
  }
}
