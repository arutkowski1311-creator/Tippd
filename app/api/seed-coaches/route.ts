import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

const ACCOUNTS = [
  { username: "JasonS", name: "Jason S", role: "assistant_coach" },
  { username: "CraigM", name: "Craig M", role: "assistant_coach" },
  { username: "JasonD", name: "Jason D", role: "assistant_coach" },
  { username: "Umpire1", name: "Umpire 1", role: "scorekeeper" },
  { username: "Umpire2", name: "Umpire 2", role: "scorekeeper" },
];

const PASSWORD = "Softballs2026";

export async function GET() {
  try {
    // Ensure the username column exists (safe to run multiple times)
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT UNIQUE`
      );
    } catch {
      // Column may already exist, that's fine
    }

    // Find the team
    const team = await prisma.team.findFirst();
    if (!team) {
      return NextResponse.json(
        { error: "No team found. Run /api/seed first." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(PASSWORD, 10);
    const results: { username: string; status: string }[] = [];

    for (const acct of ACCOUNTS) {
      // Check if username already exists
      const existing = await prisma.user.findFirst({
        where: { username: acct.username },
      });

      if (existing) {
        results.push({ username: acct.username, status: "already exists" });
        continue;
      }

      // Create user with a placeholder email (username@lineup.local)
      const user = await prisma.user.create({
        data: {
          email: `${acct.username.toLowerCase()}@lineup.local`,
          username: acct.username,
          name: acct.name,
          password: hashedPassword,
        },
      });

      // Create team membership
      await prisma.teamMembership.create({
        data: {
          teamId: team.id,
          userId: user.id,
          role: acct.role,
          status: "active",
        },
      });

      results.push({ username: acct.username, status: `created as ${acct.role}` });
    }

    return NextResponse.json({
      message: "Coach accounts seeded",
      team: team.name,
      accounts: results,
      loginInfo: "All accounts use the same password. Login with username.",
    });
  } catch (error) {
    console.error("Seed coaches error:", error);
    return NextResponse.json(
      { error: "Seed failed", details: String(error) },
      { status: 500 }
    );
  }
}
