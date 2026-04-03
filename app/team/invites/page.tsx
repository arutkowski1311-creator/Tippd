"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  Copy,
  Check,
  Trash2,
  ArrowLeft,
  Mail,
} from "lucide-react";

interface Player {
  id: string;
  firstName: string;
  lastName: string;
}

interface InviteData {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  linkedPlayer: Player | null;
}

export default function InvitesPage() {
  const router = useRouter();
  const [invites, setInvites] = useState<InviteData[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("parent");
  const [linkedPlayerId, setLinkedPlayerId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    try {
      const res = await fetch("/api/invites");
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      if (res.status === 403) {
        setError("You don't have permission to manage invites");
        return;
      }
      const data = await res.json();
      setInvites(data);
    } catch {
      setError("Failed to load invites");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadInvites();
    // Load players for the linked player dropdown
    fetch("/api/players")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPlayers(data);
      })
      .catch(() => {});
  }, [loadInvites]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role,
          linkedPlayerId: linkedPlayerId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create invite");
      }

      setEmail("");
      setRole("parent");
      setLinkedPlayerId("");
      await loadInvites();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create invite");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(inviteId: string) {
    try {
      await fetch(`/api/invites?id=${inviteId}`, { method: "DELETE" });
      await loadInvites();
    } catch {
      setError("Failed to revoke invite");
    }
  }

  function copyInviteLink(token: string, inviteId: string) {
    const url = `${window.location.origin}/auth/signup?invite=${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(inviteId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  const statusColor: Record<string, string> = {
    pending: "bg-gold/15 text-gold",
    accepted: "bg-green-500/15 text-green-400",
    expired: "bg-white/5 text-white/40",
    revoked: "bg-red-500/15 text-red-400",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-gold/70 hover:text-gold"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gold-gradient">Manage Invites</h1>
            <p className="text-sm" style={{ color: "hsl(40 5% 50%)" }}>
              Invite people to join your team
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Create invite form */}
        <div className="mb-6 rounded-xl border border-gold/10 bg-white/[0.04] p-5 card-bg-image card-bg-fans card-glow">
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gold-dim">Email address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="parent@example.com"
                  required
                  className="bg-white/5 border-white/10 focus:border-gold/40"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gold-dim">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                  style={{ background: "hsl(0 0% 10%)", borderColor: "hsl(0 0% 18%)", color: "hsl(40 20% 88%)" }}
                >
                  <option value="parent">Parent / Guardian</option>
                  <option value="assistant_coach">Assistant Coach</option>
                  <option value="scorekeeper">Scorekeeper</option>
                  <option value="head_coach">Manager</option>
                </select>
              </div>

              {role === "parent" && players.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gold-dim">
                    Link to player{" "}
                    <span className="font-normal" style={{ color: "hsl(40 5% 45%)" }}>
                      (optional)
                    </span>
                  </label>
                  <select
                    value={linkedPlayerId}
                    onChange={(e) => setLinkedPlayerId(e.target.value)}
                    className="flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                    style={{ background: "hsl(0 0% 10%)", borderColor: "hsl(0 0% 18%)", color: "hsl(40 20% 88%)" }}
                  >
                    <option value="">No player link</option>
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs" style={{ color: "hsl(40 5% 45%)" }}>
                    Links this account as a guardian for the selected player
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-lg font-semibold text-white bg-cardinal-gradient border border-cardinal-bright/30 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <UserPlus className="size-4" />
                {submitting ? "Sending..." : "Create Invite"}
              </button>
            </form>
        </div>

        {/* Invites list */}
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3 text-gold-gradient">
          Invites ({invites.length})
        </h2>

        {invites.length === 0 ? (
          <div className="rounded-xl border border-gold/10 bg-white/[0.04] py-8 text-center card-bg-image card-bg-fans">
              <Mail className="size-10 mx-auto mb-2" style={{ color: "hsl(40 5% 40%)" }} />
              <p className="text-sm" style={{ color: "hsl(40 5% 45%)" }}>
                No invites yet. Send one above.
              </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {invites.map((invite) => (
              <div key={invite.id} className="rounded-xl border border-gold/10 bg-white/[0.04] p-4 card-glow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {invite.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={statusColor[invite.status] || ""}
                        >
                          {invite.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground capitalize">
                          {invite.role === "head_coach" ? "Manager" : invite.role.replace("_", " ")}
                        </span>
                      </div>
                      {invite.linkedPlayer && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Linked to {invite.linkedPlayer.firstName}{" "}
                          {invite.linkedPlayer.lastName}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {invite.status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() =>
                              copyInviteLink(invite.token, invite.id)
                            }
                            title="Copy invite link"
                          >
                            {copiedId === invite.id ? (
                              <Check className="size-4 text-green-600" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive"
                            onClick={() => handleRevoke(invite.id)}
                            title="Revoke invite"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
