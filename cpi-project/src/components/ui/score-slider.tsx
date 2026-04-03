"use client";

import { cn, getScoreLabel } from "@/lib/utils";
import { SCORE_ANCHORS } from "@/lib/constants";

interface ScoreSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export function ScoreSlider({ label, value, onChange }: ScoreSliderProps) {
  const scoreLabel = getScoreLabel(value);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-gray-900">
          {value}{" "}
          <span className="text-xs font-normal text-gray-500">
            ({scoreLabel})
          </span>
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-indigo-600 bg-gray-200"
      />

      <div className="flex justify-between">
        {SCORE_ANCHORS.map((anchor) => (
          <span
            key={anchor.label}
            className={cn(
              "text-[10px] uppercase tracking-wide",
              value >= anchor.min && value <= anchor.max
                ? "text-indigo-600 font-semibold"
                : "text-gray-400"
            )}
          >
            {anchor.label}
          </span>
        ))}
      </div>
    </div>
  );
}
