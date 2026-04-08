"use client";

interface LedScoreboardProps {
  teamName: string;
  opponentName: string;
  teamScore: number;
  opponentScore: number;
  inning: number;
  isBottom: boolean;
  balls: number;
  strikes: number;
  outs: number;
  isLive?: boolean;
}

function LedDigit({ value, size = "lg" }: { value: string; size?: "sm" | "lg" }) {
  const sizeClass = size === "lg" ? "text-5xl sm:text-6xl" : "text-3xl sm:text-4xl";
  return (
    <span
      className={`${sizeClass} font-mono font-black led-segment led-glow tracking-tight`}
      style={{ color: "hsl(46 100% 55%)", minWidth: size === "lg" ? "40px" : "28px", textAlign: "center", display: "inline-block" }}
    >
      {value}
    </span>
  );
}

function Bulb({ on, color = "gold" }: { on: boolean; color?: "gold" | "red" | "green" }) {
  const onClass = color === "red" ? "bulb-on-red" : color === "green" ? "bulb-on-green" : "bulb-on-gold";
  return (
    <div className={`bulb ${on ? `${onClass} animate-bulb-flash` : "bulb-off"}`} />
  );
}

function CountRow({ label, count, total, color }: { label: string; count: number; total: number; color: "gold" | "red" | "green" }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold uppercase tracking-widest w-4" style={{ color: "hsl(40 5% 45%)" }}>
        {label}
      </span>
      <div className="flex gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <Bulb key={i} on={i < count} color={color} />
        ))}
      </div>
    </div>
  );
}

function InningIndicator({ inning, isBottom }: { inning: number; isBottom: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {/* Top/Bottom arrow */}
      <div className="flex flex-col items-center">
        <svg width="12" height="8" viewBox="0 0 12 8" className="mb-0.5">
          <polygon
            points="6,0 12,8 0,8"
            fill={!isBottom ? "hsl(46 100% 55%)" : "hsl(0 0% 20%)"}
          />
        </svg>
        <span
          className="text-2xl sm:text-3xl font-mono font-black led-segment"
          style={{ color: "hsl(46 100% 55%)", textShadow: "0 0 10px hsl(46 100% 55% / 0.6)" }}
        >
          {inning}
        </span>
        <svg width="12" height="8" viewBox="0 0 12 8" className="mt-0.5">
          <polygon
            points="0,0 12,0 6,8"
            fill={isBottom ? "hsl(46 100% 55%)" : "hsl(0 0% 20%)"}
          />
        </svg>
      </div>
    </div>
  );
}

export function LedScoreboard({
  teamName,
  opponentName,
  teamScore,
  opponentScore,
  inning,
  isBottom,
  balls,
  strikes,
  outs,
  isLive,
}: LedScoreboardProps) {
  return (
    <div className="scoreboard-panel rounded-xl p-4 sm:p-5">
      {/* Live indicator */}
      {isLive && (
        <div className="flex items-center gap-2 mb-3">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-red-500">Live</span>
        </div>
      )}

      {/* Main score area */}
      <div className="flex items-center justify-between gap-3">
        {/* Away / Opponent */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider truncate mb-1" style={{ color: "hsl(40 5% 50%)" }}>
            {opponentName}
          </p>
          <LedDigit value={String(opponentScore)} />
        </div>

        {/* Inning */}
        <InningIndicator inning={inning} isBottom={isBottom} />

        {/* Home / Our team */}
        <div className="flex-1 min-w-0 text-right">
          <p className="text-xs font-bold uppercase tracking-wider truncate mb-1 text-gold-gradient">
            {teamName}
          </p>
          <div className="flex justify-end">
            <LedDigit value={String(teamScore)} />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="my-3 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(40 30% 20%), transparent)" }} />

      {/* B / S / O count */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <CountRow label="B" count={balls} total={3} color="green" />
          <CountRow label="S" count={strikes} total={2} color="red" />
          <CountRow label="O" count={outs} total={2} color="gold" />
        </div>

        {/* Mini diamond for base runners - placeholder */}
        <div className="opacity-30 text-xs text-center" style={{ color: "hsl(40 5% 40%)" }}>
          {/* Can add base runner diamonds here later */}
        </div>
      </div>
    </div>
  );
}
