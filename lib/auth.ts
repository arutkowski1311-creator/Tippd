import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";
import bcrypt from "bcryptjs";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "lineup-lab-dev-secret-change-in-production"
);

const SESSION_COOKIE = "lineup-lab-session";
const SESSION_DURATION = 60 * 60 * 24 * 30; // 30 days

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
}

export async function createSession(userId: string, email: string, name: string): Promise<string> {
  const token = await new SignJWT({ userId, email, name })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${SESSION_DURATION}s`)
    .setIssuedAt()
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });

  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function signUp(email: string, password: string, name: string, inviteToken: string) {
  // Validate invite token
  const invite = await prisma.invite.findUnique({
    where: { token: inviteToken },
    include: { team: true },
  });

  if (!invite) {
    throw new Error("Invalid invite link");
  }
  if (invite.status !== "pending") {
    throw new Error("This invite has already been used or revoked");
  }
  if (invite.expiresAt < new Date()) {
    await prisma.invite.update({ where: { id: invite.id }, data: { status: "expired" } });
    throw new Error("This invite has expired");
  }
  if (invite.email.toLowerCase() !== email.toLowerCase()) {
    throw new Error("Email does not match the invite");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Email already registered");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user, team membership, and mark invite accepted in a transaction
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { email, password: hashedPassword, name },
    });

    // Create team membership with the invited role
    await tx.teamMembership.create({
      data: {
        teamId: invite.teamId,
        userId: newUser.id,
        role: invite.role,
        status: "active",
      },
    });

    // If linked to a player, create guardian relationship
    if (invite.linkedPlayerId) {
      await tx.guardian.create({
        data: {
          playerId: invite.linkedPlayerId,
          userId: newUser.id,
          name: name,
          email: email,
          relationship: "parent",
        },
      });
    }

    // Mark invite as accepted
    await tx.invite.update({
      where: { id: invite.id },
      data: {
        status: "accepted",
        acceptedAt: new Date(),
        acceptedUserId: newUser.id,
      },
    });

    return newUser;
  });

  await createSession(user.id, user.email, user.name);
  return { id: user.id, email: user.email, name: user.name, teamName: invite.team.name };
}

export async function signIn(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Invalid credentials");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error("Invalid credentials");

  await createSession(user.id, user.email, user.name);
  return { id: user.id, email: user.email, name: user.name };
}

// Get the current user's active team (first team membership)
export async function getUserTeam(userId: string) {
  const membership = await prisma.teamMembership.findFirst({
    where: { userId, status: "active" },
    include: { team: true },
  });
  return membership;
}

// For MVP: get or create a default team for the user
export async function ensureUserTeam(userId: string) {
  let membership = await prisma.teamMembership.findFirst({
    where: { userId, status: "active" },
    include: { team: true },
  });

  if (!membership) {
    // Check if there's a "default-team" to join (backward compat with seed data)
    let team = await prisma.team.findFirst({ where: { id: "default-team" } });
    if (!team) {
      team = await prisma.team.create({
        data: { id: "default-team", name: "My Team", slug: "my-team" },
      });
    }
    membership = await prisma.teamMembership.create({
      data: { teamId: team.id, userId, role: "head_coach" },
      include: { team: true },
    });
  }

  return membership;
}

const COACH_ROLES = ["head_coach", "assistant_coach", "admin"];

export function isCoachRole(role: string): boolean {
  return COACH_ROLES.includes(role);
}

export async function getUserRole(userId: string): Promise<string | null> {
  const membership = await getUserTeam(userId);
  return membership?.role ?? null;
}
