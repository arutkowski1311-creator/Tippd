import {
  Position,
  INNINGS,
  DefensiveFormat,
  BattingOrderEntry,
  FieldingAssignment,
  ValidationWarning,
  getPositionsForFormat,
  getOutfieldPositions,
} from "./types";

export function validateLineup(
  battingOrder: BattingOrderEntry[],
  fieldingAssignments: FieldingAssignment[],
  playerIds: string[],
  defensiveFormat: DefensiveFormat = "four_outfield"
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const positions = getPositionsForFormat(defensiveFormat);
  const outfieldPositions = getOutfieldPositions(defensiveFormat);

  // ─── Batting Order Validation ────────────────────────────────────
  const battingPlayerIds = battingOrder.map((b) => b.playerId);
  const battingSet = new Set(battingPlayerIds);

  if (battingSet.size !== playerIds.length) {
    const missing = playerIds.filter((id) => !battingSet.has(id));
    const duplicate = battingPlayerIds.filter(
      (id, idx) => battingPlayerIds.indexOf(id) !== idx
    );
    if (missing.length > 0) {
      warnings.push({
        type: "error",
        message: `${missing.length} player(s) missing from batting order`,
      });
    }
    if (duplicate.length > 0) {
      warnings.push({
        type: "error",
        message: `${duplicate.length} duplicate(s) in batting order`,
      });
    }
  }

  const slots = battingOrder.map((b) => b.battingSlot).sort((a, b) => a - b);
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] !== i + 1) {
      warnings.push({
        type: "error",
        message: `Batting slot numbering is not sequential (expected ${i + 1}, got ${slots[i]})`,
      });
      break;
    }
  }

  // ─── Fielding Validation ─────────────────────────────────────────
  const fewerPlayersThanPositions = playerIds.length < positions.length;

  for (const inning of INNINGS) {
    const inningAssignments = fieldingAssignments.filter(
      (a) => a.inningNumber === inning && a.assignmentType === "planned"
    );

    const positionsUsed = new Set(inningAssignments.map((a) => a.position));
    const playersUsed = new Set(inningAssignments.map((a) => a.playerId));

    for (const pos of positions) {
      if (!positionsUsed.has(pos)) {
        // If we have fewer players than positions, unfilled spots are expected — just warn
        warnings.push({
          type: fewerPlayersThanPositions ? "warning" : "error",
          message: fewerPlayersThanPositions
            ? `Inning ${inning}: ${pos} unfilled (not enough players)`
            : `Inning ${inning}: Missing position ${pos}`,
          inning,
          position: pos,
        });
      }
    }

    if (positionsUsed.size !== inningAssignments.length) {
      const posCounts = new Map<string, number>();
      for (const a of inningAssignments) {
        posCounts.set(a.position, (posCounts.get(a.position) || 0) + 1);
      }
      for (const [pos, count] of posCounts) {
        if (count > 1) {
          warnings.push({
            type: "error",
            message: `Inning ${inning}: Position ${pos} assigned ${count} times`,
            inning,
            position: pos as Position,
          });
        }
      }
    }

    if (playersUsed.size !== inningAssignments.length) {
      const playerCounts = new Map<string, number>();
      for (const a of inningAssignments) {
        playerCounts.set(a.playerId, (playerCounts.get(a.playerId) || 0) + 1);
      }
      for (const [playerId, count] of playerCounts) {
        if (count > 1) {
          warnings.push({
            type: "error",
            message: `Inning ${inning}: A player is assigned to ${count} positions`,
            inning,
            playerId,
          });
        }
      }
    }
  }

  // ─── Outfield Streak Check ──────────────────────────────────────
  const playerOutfieldInnings = new Map<string, number[]>();

  for (const a of fieldingAssignments.filter((a) => a.assignmentType === "planned")) {
    if (outfieldPositions.includes(a.position as Position)) {
      if (!playerOutfieldInnings.has(a.playerId)) {
        playerOutfieldInnings.set(a.playerId, []);
      }
      playerOutfieldInnings.get(a.playerId)!.push(a.inningNumber);
    }
  }

  for (const [playerId, innings] of playerOutfieldInnings) {
    innings.sort((a, b) => a - b);
    let streak = 1;
    for (let i = 1; i < innings.length; i++) {
      if (innings[i] === innings[i - 1] + 1) {
        streak++;
        if (streak > 2) {
          warnings.push({
            type: "warning",
            message: `Player in outfield ${streak}+ consecutive innings (innings ${innings[i - streak + 1]}-${innings[i]})`,
            playerId,
          });
          break;
        }
      } else {
        streak = 1;
      }
    }
  }

  return warnings;
}

export function hasErrors(warnings: ValidationWarning[]): boolean {
  return warnings.some((w) => w.type === "error");
}
