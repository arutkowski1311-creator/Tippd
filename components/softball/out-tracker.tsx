"use client";

import { cn } from "@/lib/utils";

interface OutTrackerProps {
  outs: number;
  size?: "sm" | "lg";
}

export function OutTracker({ outs, size = "sm" }: OutTrackerProps) {
  const dotSize = size === "lg" ? "size-8" : "size-5";
  const gap = size === "lg" ? "gap-3" : "gap-2";

  return (
    <div className={cn("flex items-center", gap)}>
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className={cn(
            "rounded-full transition-all",
            dotSize,
            n <= outs
              ? "bulb bulb-on-red"
              : "bulb bulb-off"
          )}
        />
      ))}
    </div>
  );
}
