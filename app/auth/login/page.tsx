"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlayCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Invalid username or password");
      }

      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  }

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
          <p className="text-sm text-neutral-400">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="card-glow rounded-xl border border-white/[0.08] bg-[hsl(0_0%_10%)] p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-300">
                Username or Email
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Username or email"
                required
                autoCapitalize="none"
                autoCorrect="off"
                className="h-10 w-full rounded-lg border border-white/[0.08] bg-[hsl(0_0%_13%)] px-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[hsl(46_100%_50%)]/40 focus:border-[hsl(46_100%_50%)]/50 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-300">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="h-10 w-full rounded-lg border border-white/[0.08] bg-[hsl(0_0%_13%)] px-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[hsl(46_100%_50%)]/40 focus:border-[hsl(46_100%_50%)]/50 transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-lg bg-cardinal-gradient text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-900/25"
            >
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-neutral-400">
          Need an account?{" "}
          <Link
            href="/auth/signup"
            className="text-[hsl(46_100%_50%)] font-medium hover:underline"
          >
            Sign up
          </Link>{" "}
          or ask your coach for an invite link.
        </p>
      </div>
    </div>
  );
}
