"use client";

import { cn } from "@/lib/utils";

interface RatingInputProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
}

export function RatingInput({ value, onChange, label }: RatingInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const isSelected = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                "flex items-center justify-center rounded-lg text-sm font-bold min-w-[44px] min-h-[44px] transition-all",
                isSelected
                  ? "ring-2 ring-offset-1"
                  : "border hover:bg-muted"
              )}
              style={isSelected ? {
                background: "hsl(46 100% 50%)",
                color: "hsl(0 0% 7%)",
                borderColor: "hsl(46 100% 55%)",
                boxShadow: "0 0 10px hsl(46 100% 50% / 0.3)",
                ringColor: "hsl(46 100% 50%)",
              } : {
                background: "hsl(0 0% 12%)",
                borderColor: "hsl(0 0% 22%)",
                color: "hsl(40 20% 85%)",
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
