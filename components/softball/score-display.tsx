"use client";

import { cn } from "@/lib/utils";

interface ScoreByInning {
  inningNumber: number;
  usRuns: number;
  opponentRuns: number;
}

interface ScoreDisplayProps {
  scoreByInning: ScoreByInning[];
  teamName?: string;
  opponentName?: string;
  currentInning?: number;
}

export function ScoreDisplay({
  scoreByInning,
  teamName = "Us",
  opponentName = "Opp",
  currentInning,
}: ScoreDisplayProps) {
  const innings = scoreByInning.length > 0
    ? scoreByInning
    : Array.from({ length: 6 }, (_, i) => ({
        inningNumber: i + 1,
        usRuns: 0,
        opponentRuns: 0,
      }));

  const totalUs = innings.reduce((sum, i) => sum + i.usRuns, 0);
  const totalOpp = innings.reduce((sum, i) => sum + i.opponentRuns, 0);

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full min-w-[320px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="px-2 py-1.5 text-left font-medium w-16" style={{ color: "hsl(40 5% 50%)" }} />
            {innings.map((inn) => (
              <th
                key={inn.inningNumber}
                className={cn(
                  "px-2 py-1.5 text-center font-medium min-w-[32px]",
                  currentInning === inn.inningNumber
                    ? "font-bold"
                    : ""
                )}
                style={{
                  color: currentInning === inn.inningNumber
                    ? "hsl(46 100% 55%)"
                    : "hsl(40 5% 50%)",
                }}
              >
                {inn.inningNumber}
              </th>
            ))}
            <th className="px-2 py-1.5 text-center font-bold" style={{ color: "hsl(46 100% 55%)" }}>R</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderTop: "1px solid hsl(0 0% 18%)" }}>
            <td className="px-2 py-1.5 font-medium text-xs truncate max-w-[64px] text-gold-gradient">
              {teamName}
            </td>
            {innings.map((inn) => (
              <td
                key={inn.inningNumber}
                className={cn(
                  "px-2 py-1.5 text-center font-mono",
                  currentInning === inn.inningNumber && "font-bold"
                )}
                style={{
                  color: "hsl(40 20% 92%)",
                  background: currentInning === inn.inningNumber ? "hsl(46 100% 50% / 0.05)" : undefined,
                }}
              >
                {inn.usRuns}
              </td>
            ))}
            <td className="px-2 py-1.5 text-center font-bold font-mono led-segment" style={{ color: "hsl(46 100% 55%)", textShadow: "0 0 8px hsl(46 100% 55% / 0.4)" }}>{totalUs}</td>
          </tr>
          <tr style={{ borderTop: "1px solid hsl(0 0% 18%)" }}>
            <td className="px-2 py-1.5 font-medium text-xs truncate max-w-[64px]" style={{ color: "hsl(40 5% 50%)" }}>
              {opponentName}
            </td>
            {innings.map((inn) => (
              <td
                key={inn.inningNumber}
                className={cn(
                  "px-2 py-1.5 text-center font-mono",
                  currentInning === inn.inningNumber && "font-bold"
                )}
                style={{
                  color: "hsl(40 20% 85%)",
                  background: currentInning === inn.inningNumber ? "hsl(46 100% 50% / 0.05)" : undefined,
                }}
              >
                {inn.opponentRuns}
              </td>
            ))}
            <td className="px-2 py-1.5 text-center font-bold font-mono led-segment" style={{ color: "hsl(40 20% 85%)" }}>{totalOpp}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
