"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { PlayerCard } from "@/components/softball/player-card";
import { RatingInput } from "@/components/softball/rating-input";
import type { PlayerData } from "@/lib/types";

const COACH_ROLES = ["head_coach", "assistant_coach", "admin"];

export default function RosterPage() {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<PlayerData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const isCoach = userRole !== null && COACH_ROLES.includes(userRole);

  // Edit form state
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    fieldingOverall: 3,
    catching: 3,
    throwing: 3,
    battingOverall: 3,
  });

  // Add form state
  const [addForm, setAddForm] = useState({
    firstName: "",
    lastName: "",
    dob: "",
  });

  // Fetch user role
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.team?.role) {
          setUserRole(data.team.role);
        }
      })
      .catch(() => {});
  }, []);

  const fetchPlayers = useCallback(() => {
    fetch("/api/players")
      .then((res) => res.json())
      .then((data) => setPlayers(data))
      .catch(() => toast.error("Failed to load players"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  function openEdit(player: PlayerData) {
    if (!isCoach) return;
    setEditingPlayer(player);
    setEditForm({
      firstName: player.firstName,
      lastName: player.lastName,
      dob: player.dob.slice(0, 10),
      fieldingOverall: player.fieldingOverall,
      catching: player.catching,
      throwing: player.throwing,
      battingOverall: player.battingOverall,
    });
    setSheetOpen(true);
  }

  async function saveEdit() {
    if (!editingPlayer || !isCoach) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/players/${editingPlayer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      toast.success("Player updated");
      setSheetOpen(false);
      fetchPlayers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save player");
    } finally {
      setSaving(false);
    }
  }

  async function deletePlayer() {
    if (!editingPlayer || !isCoach) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/players/${editingPlayer.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove");
      }
      toast.success("Player removed");
      setSheetOpen(false);
      fetchPlayers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove player");
    } finally {
      setSaving(false);
    }
  }

  async function addPlayer() {
    if (!addForm.firstName || !addForm.lastName || !addForm.dob) {
      toast.error("All fields are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add");
      }
      toast.success("Player added");
      setAddOpen(false);
      setAddForm({ firstName: "", lastName: "", dob: "" });
      fetchPlayers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add player");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-6 max-w-lg mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-gold-gradient">Roster</h1>
        {isCoach && (
          <div className="flex gap-2">
            <Button size="sm" className="bg-cardinal-gradient border-cardinal-bright/30 text-white hover:opacity-90" render={<Link href="/roster/import" />}>
              <Upload className="size-4 mr-1" />
              Import
            </Button>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger
                render={
                  <Button size="sm" className="bg-cardinal-gradient border-cardinal-bright/30 text-white hover:opacity-90">
                    <Plus className="size-4 mr-1" />
                    Add
                  </Button>
                }
              />
              <DialogContent className="bg-[hsl(0_0%_10%)] border-gold/20 text-white">
                <DialogHeader>
                  <DialogTitle className="text-gold-gradient">Add Player</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-sm font-medium">First Name</label>
                    <Input
                      value={addForm.firstName}
                      onChange={(e) =>
                        setAddForm((f) => ({ ...f, firstName: e.target.value }))
                      }
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Last Name</label>
                    <Input
                      value={addForm.lastName}
                      onChange={(e) =>
                        setAddForm((f) => ({ ...f, lastName: e.target.value }))
                      }
                      placeholder="Last name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Date of Birth</label>
                    <Input
                      type="date"
                      value={addForm.dob}
                      onChange={(e) =>
                        setAddForm((f) => ({ ...f, dob: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={addPlayer} disabled={saving} className="w-full bg-cardinal-gradient border-cardinal-bright/30 text-white hover:opacity-90">
                    {saving ? "Adding..." : "Add Player"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </header>

      {players.length === 0 ? (
        <EmptyState
          title="No players yet"
          description={isCoach ? "Import your roster from a spreadsheet or add players one at a time." : "Your coach hasn't added any players yet."}
          className="text-gold/70 [&_h3]:text-gold [&_p]:text-gold/60"
          action={
            isCoach ? (
              <Button className="bg-cardinal-gradient border-cardinal-bright/30 text-white hover:opacity-90" render={<Link href="/roster/import" />}>
                Import Roster
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-1">
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              onEdit={isCoach ? () => openEdit(player) : undefined}
              compact
              showRatings={isCoach}
            />
          ))}
        </div>
      )}

      {/* Edit sheet — only rendered for coaches */}
      {isCoach && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="right" className="bg-[hsl(0_0%_10%)] border-gold/20 text-white">
            <SheetHeader>
              <SheetTitle className="text-gold-gradient">Edit Player</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-4 overflow-y-auto flex-1 px-4">
              <div>
                <label className="text-sm font-medium">First Name</label>
                <Input
                  value={editForm.firstName}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, firstName: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Last Name</label>
                <Input
                  value={editForm.lastName}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, lastName: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Date of Birth</label>
                <Input
                  type="date"
                  value={editForm.dob}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, dob: e.target.value }))
                  }
                />
              </div>
              <RatingInput
                label="Fielding"
                value={editForm.fieldingOverall}
                onChange={(v) => setEditForm((f) => ({ ...f, fieldingOverall: v }))}
              />
              <RatingInput
                label="Catching"
                value={editForm.catching}
                onChange={(v) => setEditForm((f) => ({ ...f, catching: v }))}
              />
              <RatingInput
                label="Throwing"
                value={editForm.throwing}
                onChange={(v) => setEditForm((f) => ({ ...f, throwing: v }))}
              />
              <RatingInput
                label="Batting"
                value={editForm.battingOverall}
                onChange={(v) => setEditForm((f) => ({ ...f, battingOverall: v }))}
              />
            </div>
            <SheetFooter>
              <Button onClick={saveEdit} disabled={saving} className="w-full bg-cardinal-gradient border-cardinal-bright/30 text-white hover:opacity-90">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="destructive"
                onClick={deletePlayer}
                disabled={saving}
                className="w-full"
              >
                Remove Player
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
