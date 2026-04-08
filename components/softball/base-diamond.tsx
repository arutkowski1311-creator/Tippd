"use client";

import { cn } from "@/lib/utils";

interface BaseDiamondProps {
  runners: { first: boolean; second: boolean; third: boolean };
  size?: "sm" | "lg";
}

export function BaseDiamond({ runners, size = "sm" }: BaseDiamondProps) {
  const containerSize = size === "lg" ? "w-[120px] h-[120px]" : "w-[80px] h-[80px]";
  const baseSize = size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5";
  const homeSize = size === "lg" ? "w-4 h-4" : "w-3 h-3";

  const onStyle = {
    background: "hsl(46 100% 50%)",
    borderColor: "hsl(46 100% 55%)",
    boxShadow: "0 0 8px hsl(46 100% 50%), 0 0 16px hsl(46 100% 50% / 0.4)",
  };

  const offStyle = {
    background: "transparent",
    borderColor: "hsl(0 0% 25%)",
  };

  return (
    <div className={cn("relative", containerSize)}>
      {/* Second base - top center */}
      <div
        className={cn(
          "absolute left-1/2 top-0 -translate-x-1/2 rotate-45 border-2 transition-all",
          baseSize
        )}
        style={runners.second ? onStyle : offStyle}
      />

      {/* Third base - middle left */}
      <div
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 rotate-45 border-2 transition-all",
          baseSize
        )}
        style={runners.third ? onStyle : offStyle}
      />

      {/* First base - middle right */}
      <div
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 rotate-45 border-2 transition-all",
          baseSize
        )}
        style={runners.first ? onStyle : offStyle}
      />

      {/* Home plate - bottom center */}
      <div
        className={cn(
          "absolute left-1/2 bottom-0 -translate-x-1/2 rotate-45 border-2",
          homeSize
        )}
        style={{ background: "hsl(0 0% 80%)", borderColor: "hsl(0 0% 50%)" }}
      />

      {/* Diamond lines */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M50 8 L92 50 L50 92 L8 50 Z"
          stroke="hsl(0 0% 22%)"
          strokeWidth="1"
          fill="none"
        />
      </svg>
    </div>
  );
}
