import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    // Check if already seeded
    const existing = await prisma.user.findUnique({
      where: { email: "arutkowski1311@gmail.com" },
    });

    if (existing) {
      return NextResponse.json({ message: "Already seeded", seeded: false });
    }

    // Create default team
    const team = await prisma.team.upsert({
      where: { id: "default-team" },
      update: {},
      create: {
        id: "default-team",
        name: "My Team",
        slug: "my-team",
        sport: "softball",
      },
    });

    // Create coach account
    const hashedPassword = await bcrypt.hash("Megan1311!", 10);
    const user = await prisma.user.upsert({
      where: { email: "arutkowski1311@gmail.com" },
      update: {},
      create: {
        id: "head-coach",
        email: "arutkowski1311@gmail.com",
        name: "Coach Rutkowski",
        password: hashedPassword,
      },
    });

    // Create team membership
    await prisma.teamMembership.upsert({
      where: { id: "coach-membership" },
      update: {},
      create: {
        id: "coach-membership",
        teamId: team.id,
        userId: user.id,
        role: "head_coach",
        status: "active",
      },
    });

    return NextResponse.json({
      message: "Seeded successfully",
      seeded: true,
      email: "arutkowski1311@gmail.com",
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Seed failed", details: String(error) },
      { status: 500 }
    );
  }
}
