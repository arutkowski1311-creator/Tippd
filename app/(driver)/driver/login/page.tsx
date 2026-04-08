"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Smartphone, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function DriverLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // Verify they are a driver
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", authUser.id)
        .single();

      if (profile && profile.role !== "driver") {
        setError("This login is for drivers only. Please use the main login.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
    }

    router.push("/driver");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        {/* Logo */}
        <div className="w-14 h-14 rounded-xl bg-tippd-blue mx-auto flex items-center justify-center text-white mb-6">
          <Smartphone className="w-7 h-7" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900">Driver Sign In</h1>
        <p className="text-gray-500 text-sm mt-2 mb-8">
          Sign in with your driver credentials to view today&apos;s route.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm text-left">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 rounded-lg border-2 border-gray-200 text-base outline-none focus:border-tippd-blue"
              placeholder="you@company.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 rounded-lg border-2 border-gray-200 text-base outline-none focus:border-tippd-blue"
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-tippd-blue text-white rounded-lg text-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="text-xs text-gray-400 mt-6">
          Not a driver?{" "}
          <a href="/login" className="text-tippd-blue hover:underline">
            Owner / Manager login
          </a>
        </p>
      </div>
    </div>
  );
}
