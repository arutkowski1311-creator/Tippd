import { NextResponse } from "next/server";
import { signUp } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, inviteToken } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    if (!inviteToken) {
      return NextResponse.json(
        { error: "An invite link is required to sign up" },
        { status: 400 }
      );
    }

    const user = await signUp(email, password, name, inviteToken);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const msg = error.message;
      if (msg === "Email already registered") {
        return NextResponse.json({ error: msg }, { status: 409 });
      }
      if (
        msg === "Invalid invite link" ||
        msg === "This invite has already been used or revoked" ||
        msg === "This invite has expired" ||
        msg === "Email does not match the invite"
      ) {
        return NextResponse.json({ error: msg }, { status: 403 });
      }
    }
    console.error("Failed to sign up:", error);
    return NextResponse.json(
      { error: "Failed to sign up" },
      { status: 500 }
    );
  }
}
