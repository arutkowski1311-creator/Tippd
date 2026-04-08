"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PlayCircle, ShieldCheck } from "lucide-react";

interface InviteInfo {
  valid: boolean;
  email?: string;
  role?: string;
  teamName?: string;
  linkedPlayer?: string | null;
  error?: string;
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[hsl(0_0%_7%)]">
          <p className="text-neutral-400">Loading...</p>
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(!!inviteToken);

  useEffect(() => {
    if (!inviteToken) {
      setLoadingInvite(false);
      return;
    }

    fetch(`/api/invites/validate?token=${encodeURIComponent(inviteToken)}`)
      .then((res) => res.json())
      .then((data: InviteInfo) => {
        setInviteInfo(data);
        if (data.valid && data.email) {
          setEmail(data.email);
        }
      })
      .catch(() => {
        setInviteInfo({ valid: false, error: "Failed to validate invite" });
      })
      .finally(() => setLoadingInvite(false));
  }, [inviteToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, inviteToken }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create account");
      }

      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClasses =
    "h-10 w-full rounded-lg border border-white/[0.08] bg-[hsl(0_0%_13%)] px-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[hsl(46_100%_50%)]/40 focus:border-[hsl(46_100%_50%)]/50 transition-colors";

  if (loadingInvite) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-[hsl(0_0%_7%)]">
        <p className="text-neutral-400">Validating invite...</p>
      </div>
    );
  }

  // No invite token provided
  if (!inviteToken) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 bg-[hsl(0_0%_7%)]">
        <div className="w-full max-w-sm flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3">
            <div className="size-16 rounded-2xl bg-cardinal-gradient flex items-center justify-center shadow-lg shadow-red-900/20">
              <PlayCircle className="size-9 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gold-gradient">
              Lineup Lab
            </h1>
          </div>

          <div className="card-glow rounded-xl border border-white/[0.08] bg-[hsl(0_0%_10%)] p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <ShieldCheck className="size-12 text-neutral-500" />
              <h2 className="text-lg font-semibold text-white">
                Invite Required
              </h2>
              <p className="text-sm text-neutral-400">
                Lineup Lab is invite-only to keep your team safe. Ask your coach
                or team manager to send you an invite link.
              </p>
            </div>
          </div>

          <p className="text-center text-sm text-neutral-400">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-[hsl(46_100%_50%)] font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Invalid invite
  if (inviteInfo && !inviteInfo.valid) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 bg-[hsl(0_0%_7%)]">
        <div className="w-full max-w-sm flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3">
            <div className="size-16 rounded-2xl bg-cardinal-gradient flex items-center justify-center shadow-lg shadow-red-900/20">
              <PlayCircle className="size-9 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gold-gradient">
              Lineup Lab
            </h1>
          </div>

          <div className="card-glow rounded-xl border border-white/[0.08] bg-[hsl(0_0%_10%)] p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <ShieldCheck className="size-12 text-red-400" />
              <h2 className="text-lg font-semibold text-white">
                Invalid Invite
              </h2>
              <p className="text-sm text-neutral-400">
                {inviteInfo.error ||
                  "This invite link is no longer valid. Ask your coach for a new one."}
              </p>
            </div>
          </div>

          <p className="text-center text-sm text-neutral-400">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-[hsl(46_100%_50%)] font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Valid invite — show signup form
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 bg-[hsl(0_0%_7%)]">
      <div className="w-full max-w-sm flex flex-col gap-6">
        {/* Branding */}
        <div className="flex flex-col items-center gap-3">
          <div className="size-16 rounded-2xl bg-cardinal-gradient flex items-center justify-center shadow-lg shadow-red-900/20">
            <PlayCircle className="size-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gold-gradient">
            Lineup Lab
          </h1>
          <p className="text-sm text-neutral-400">Create your account</p>
        </div>

        {/* Invite banner */}
        {inviteInfo && (
          <div className="rounded-xl border border-[hsl(46_100%_50%)]/20 bg-[hsl(46_100%_50%)]/[0.04] p-4">
            <div className="flex flex-col gap-1 text-sm">
              <p className="font-medium text-white">
                You&apos;ve been invited to join{" "}
                <span className="text-[hsl(46_100%_50%)]">
                  {inviteInfo.teamName}
                </span>
              </p>
              <p className="text-neutral-400">
                Role: {inviteInfo.role?.replace("_", " ")}
                {inviteInfo.linkedPlayer &&
                  ` \u00B7 Linked to ${inviteInfo.linkedPlayer}`}
              </p>
            </div>
          </div>
        )}

        {/* Form card */}
        <div className="card-glow rounded-xl border border-white/[0.08] bg-[hsl(0_0%_10%)] p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-300">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className={inputClasses}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-300">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="coach@example.com"
                required
                readOnly={!!inviteInfo?.email}
                className={`${inputClasses} ${inviteInfo?.email ? "opacity-60 cursor-not-allowed" : ""}`}
              />
              {inviteInfo?.email && (
                <p className="text-xs text-neutral-500">
                  Must match the invited email address
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-300">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
                minLength={8}
                className={inputClasses}
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-lg bg-cardinal-gradient text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-900/25"
            >
              {submitting ? "Creating account..." : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-neutral-400">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="text-[hsl(46_100%_50%)] font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
