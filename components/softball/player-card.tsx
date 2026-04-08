"use client";

import { cn, playerAge, playerFullName } from "@/lib/utils";

interface PlayerCardProps {
  player: {
    id: string;
    firstName: string;
    lastName: string;
    dob: string;
    fieldingOverall: number;
    catching: number;
    throwing: number;
    battingOverall: number;
    active: boolean;
  };
  onEdit?: (player: PlayerCardProps["player"]) => void;
  compact?: boolean;
  showRatings?: boolean;
}

function RatingDot({ value, label }: { value: number; label?: string }) {
  const color =
    value <= 2
      ? "bg-cardinal/80 text-white ring-1 ring-cardinal-bright/30"
      : value === 3
        ? "bg-gold/20 text-gold ring-1 ring-gold/40"
        : "bg-gold/30 text-gold font-extrabold ring-1 ring-gold/60";

  return (
    <span className="flex items-center gap-1">
      {label && (
        <span className="text-xs text-gold/50">{label}</span>
      )}
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full text-[10px] font-bold",
          label ? "size-6" : "size-5",
          color
        )}
      >
        {value}
      </span>
    </span>
  );
}

export function PlayerCard({ player, onEdit, compact = false, showRatings = true }: PlayerCardProps) {
  const age = playerAge(player.dob);
  const name = playerFullName(player.firstName, player.lastName);

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => onEdit?.(player)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all bg-white/[0.03] border border-transparent hover:border-gold/20 card-glow hover:bg-white/[0.06] active:bg-white/[0.08] card-bg-image card-bg-cards team-initials-watermark"
      >
        <div className="flex-1 min-w-0">
          <span className="font-medium truncate block text-white">{name}</span>
          <span className="text-xs text-gold/50">Age {age}</span>
        </div>
        {showRatings && (
          <div className="flex items-center gap-1">
            <RatingDot value={player.fieldingOverall} />
            <RatingDot value={player.catching} />
            <RatingDot value={player.throwing} />
            <RatingDot value={player.battingOverall} />
          </div>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onEdit?.(player)}
      className="flex w-full flex-col gap-3 rounded-xl border border-gold/10 bg-white/[0.04] p-4 text-left shadow-sm transition-all card-glow hover:border-gold/30 hover:bg-white/[0.07] active:bg-white/[0.10] card-bg-image card-bg-cards team-initials-watermark"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-base text-white">{name}</p>
          <p className="text-sm text-gold/50">Age {age}</p>
        </div>
      </div>
      {showRatings && (
        <div className="grid grid-cols-4 gap-2">
          <RatingDot value={player.fieldingOverall} label="Field" />
          <RatingDot value={player.catching} label="Catch" />
          <RatingDot value={player.throwing} label="Throw" />
          <RatingDot value={player.battingOverall} label="Bat" />
        </div>
      )}
    </button>
  );
}
