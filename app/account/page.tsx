"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, KeyRound, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (res.status === 401) {
          router.push("/auth/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setUser(data.user);
          setRole(data.team?.role ?? null);
        }
      })
      .catch(() => router.push("/auth/login"));
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/auth/login");
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || "Failed to change password");
      } else {
        setPasswordMsg("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setPasswordError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const roleLabels: Record<string, string> = {
    head_coach: "Manager",
    assistant_coach: "Assistant Coach",
    admin: "Admin",
    scorekeeper: "Scorekeeper",
    parent: "Parent",
    member: "Member",
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-lg mx-auto pb-24">
      <h1 className="text-2xl font-bold text-gold-gradient">Account</h1>

      {/* User Info */}
      <div className="rounded-xl border border-white/[0.08] bg-[hsl(0_0%_10%)] p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-cardinal-gradient flex items-center justify-center">
            <User className="size-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-lg text-white">{user.name}</p>
            <p className="text-sm text-neutral-400">{user.email}</p>
          </div>
        </div>
        {role && (
          <div className="flex items-center gap-2 text-sm text-neutral-300">
            <Shield className="size-4 text-gold" />
            <span>{roleLabels[role] ?? role}</span>
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="rounded-xl border border-white/[0.08] bg-[hsl(0_0%_10%)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="size-5 text-gold" />
          <h2 className="font-bold text-white">Change Password</h2>
        </div>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            required
            className="h-10 w-full rounded-lg border border-white/[0.08] bg-[hsl(0_0%_13%)] px-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[hsl(46_100%_50%)]/40 transition-colors"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            required
            className="h-10 w-full rounded-lg border border-white/[0.08] bg-[hsl(0_0%_13%)] px-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[hsl(46_100%_50%)]/40 transition-colors"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
            className="h-10 w-full rounded-lg border border-white/[0.08] bg-[hsl(0_0%_13%)] px-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[hsl(46_100%_50%)]/40 transition-colors"
          />
          {passwordError && <p className="text-sm text-red-400">{passwordError}</p>}
          {passwordMsg && <p className="text-sm text-green-400">{passwordMsg}</p>}
          <Button
            type="submit"
            disabled={saving}
            className="w-full h-11 rounded-lg bg-gold text-background font-semibold text-sm hover:bg-gold/90 disabled:opacity-50"
          >
            {saving ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </div>

      {/* Logout */}
      <Button
        onClick={handleLogout}
        disabled={loggingOut}
        variant="outline"
        className="w-full h-12 rounded-xl border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-semibold"
      >
        <LogOut className="size-5 mr-2" />
        {loggingOut ? "Signing out..." : "Sign Out"}
      </Button>
    </div>
  );
}
