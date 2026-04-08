"use client";

import { cn } from "@/lib/utils";
import type { Position } from "@/lib/types";

const INFIELD_ROW: Position[] = ["P", "C", "1B", "2B", "SS", "3B"];
const OUTFIELD_ROW: Position[] = ["LF", "LC", "RC", "RF"];

interface PositionPickerProps {
  value: Position | null;
  onChange: (position: Position) => void;
  availablePositions?: Position[];
}

export function PositionPicker({
  value,
  onChange,
  availablePositions,
}: PositionPickerProps) {
  function renderButton(pos: Position) {
    const isAvailable = !availablePositions || availablePositions.includes(pos);
    const isSelected = value === pos;

    return (
      <button
        key={pos}
        type="button"
        disabled={!isAvailable}
        onClick={() => onChange(pos)}
        className={cn(
          "flex items-center justify-center rounded-lg text-sm font-bold min-w-[44px] min-h-[44px] transition-all",
          isSelected
            ? "ring-2 ring-offset-1"
            : isAvailable
              ? "border hover:opacity-80"
              : "border opacity-30 cursor-not-allowed"
        )}
        style={isSelected ? {
          background: "hsl(46 100% 50%)",
          color: "hsl(0 0% 7%)",
          boxShadow: "0 0 12px hsl(46 100% 50% / 0.4)",
          borderColor: "hsl(46 100% 55%)",
        } : isAvailable ? {
          background: "hsl(0 0% 12%)",
          borderColor: "hsl(0 0% 22%)",
          color: "hsl(40 20% 85%)",
        } : {
          background: "hsl(0 0% 10%)",
          borderColor: "hsl(0 0% 15%)",
          color: "hsl(0 0% 35%)",
        }}
      >
        {pos}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 flex-wrap justify-center">
        {INFIELD_ROW.map(renderButton)}
      </div>
      <div className="flex gap-2 flex-wrap justify-center">
        {OUTFIELD_ROW.map(renderButton)}
      </div>
    </div>
  );
}
