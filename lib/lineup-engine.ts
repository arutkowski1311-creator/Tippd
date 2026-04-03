import {
  Position,
  POSITIONS,
  INNINGS,
  CoachMode,
  DefensiveFormat,
  PlayerSuitability,
  PlayerHistory,
  BattingOrderEntry,
  FieldingAssignment,
  LineupData,
  PlayerData,
  getPositionsForFormat,
  getOutfieldPositions,
  getInfieldPositions,
} from "./types";
import { playerAge } from "./utils";

// ─── Suitability Scoring ───────────────────────────────────────────────

export function computeSuitability(
  player: PlayerData,
  gameDate: Date
): PlayerSuitability {
  const age = playerAge(player.dob, gameDate);
  const f = player.fieldingOverall;
  const c = player.catching;
  const t = player.throwing;
  const b = player.battingOverall;

  return {
    playerId: player.id,
    pitcherScore: f * 0.4 + t * 0.6,
    firstBaseScore: f * 0.6 + t * 0.4,
    thirdBaseScore: f * 0.5 + t * 0.5,
    catcherScore: c * 0.5 + f * 0.3 + t * 0.2,
    shortstopScore: f * 0.5 + t * 0.3 + (b > 3 ? 0.5 : 0),
    secondBaseScore: f * 0.5 + t * 0.3 + (b > 3 ? 0.3 : 0),
    outfieldScore: f * 0.5 + t * 0.3 + (age < 10 ? 0.5 : 0),
    battingTier: b >= 4 ? "strong" : b >= 3 ? "medium" : "weaker",
    ageOnGameDate: age,
  };
}

function positionScore(suit: PlayerSuitability, pos: Position): number {
  switch (pos) {
    case "P": return suit.pitcherScore;
    case "C": return suit.catcherScore;
    case "1B": return suit.firstBaseScore;
    case "3B": return suit.thirdBaseScore;
    case "SS": return suit.shortstopScore;
    case "2B": return suit.secondBaseScore;
    case "LF": case "LC": case "RC": case "RF":
    case "CF": case "LCF": case "RCF":
      return suit.outfieldScore;
    default: return suit.outfieldScore;
  }
}

function isOutfieldPosition(pos: Position, outfieldPositions: Position[]): boolean {
  return outfieldPositions.includes(pos);
}

// ─── Mode Weights ──────────────────────────────────────────────────────

interface ModeWeights {
  suitability: number;
  fairness: number;
  development: number;
}

function getModeWeights(mode: CoachMode): ModeWeights {
  switch (mode) {
    case "development": return { suitability: 0.3, fairness: 0.5, development: 0.2 };
    case "balanced": return { suitability: 0.45, fairness: 0.35, development: 0.2 };
    case "win-now": return { suitability: 0.65, fairness: 0.2, development: 0.15 };
  }
}

// ─── Fielding Generation ───────────────────────────────────────────────

interface FieldingContext {
  playerIds: string[];
  positions: Position[];
  outfieldPositions: Position[];
  suitabilities: Map<string, PlayerSuitability>;
  histories: Map<string, PlayerHistory>;
  mode: CoachMode;
  lockedFielding: Map<string, { playerId: string }>;
}

function makeFieldingKey(inning: number, position: Position): string {
  return `${inning}-${position}`;
}

/**
 * Core rule: no player at the same position more than 2 consecutive innings.
 * All players must be assigned every inning (when playerCount <= positionCount).
 * Younger/less-skilled players weighted toward outfield.
 */
export function generateFieldingPlan(ctx: FieldingContext): FieldingAssignment[] {
  const weights = getModeWeights(ctx.mode);
  const assignments: FieldingAssignment[] = [];

  // Track consecutive innings at each position per player
  // positionStreak[playerId][position] = consecutive innings at that position ending at previous inning
  const positionStreak = new Map<string, Map<Position, number>>();
  const inningsAssigned = new Map<string, number>();

  ctx.playerIds.forEach((id) => {
    positionStreak.set(id, new Map());
    inningsAssigned.set(id, 0);
  });

  // Plan catchers first (blocks of max 2 innings)
  const catcherPlan = planCatcherBlocks(ctx);

  for (const inning of INNINGS) {
    const assignedThisInning = new Map<Position, string>();
    const usedThisInning = new Set<string>();

    // 1. Apply locked assignments
    for (const pos of ctx.positions) {
      const key = makeFieldingKey(inning, pos);
      const locked = ctx.lockedFielding.get(key);
      if (locked) {
        assignedThisInning.set(pos, locked.playerId);
        usedThisInning.add(locked.playerId);
      }
    }

    // 2. Assign catcher if not locked
    if (!assignedThisInning.has("C")) {
      const catcherId = catcherPlan.get(inning);
      if (catcherId && !usedThisInning.has(catcherId)) {
        assignedThisInning.set("C", catcherId);
        usedThisInning.add(catcherId);
      }
    }

    // 3. Assign infield positions: P, 1B, 3B, SS, 2B
    const infieldOrder: Position[] = ["P", "1B", "3B", "SS", "2B"];
    for (const pos of infieldOrder) {
      if (!ctx.positions.includes(pos)) continue;
      if (assignedThisInning.has(pos)) continue;
      const best = pickBestForPosition(
        pos, inning, ctx, usedThisInning, positionStreak, inningsAssigned, weights
      );
      if (best) {
        assignedThisInning.set(pos, best);
        usedThisInning.add(best);
      }
    }

    // 4. Assign outfield positions
    for (const pos of ctx.outfieldPositions) {
      if (assignedThisInning.has(pos)) continue;
      const best = pickBestForPosition(
        pos, inning, ctx, usedThisInning, positionStreak, inningsAssigned, weights
      );
      if (best) {
        assignedThisInning.set(pos, best);
        usedThisInning.add(best);
      }
    }

    // 5. Fill any remaining empty spots with remaining players
    const emptyPositions = ctx.positions.filter((p) => !assignedThisInning.has(p));
    const remainingPlayers = ctx.playerIds.filter((id) => !usedThisInning.has(id));

    // Sort remaining players — prefer weaker/younger for outfield spots
    for (let i = 0; i < Math.min(emptyPositions.length, remainingPlayers.length); i++) {
      assignedThisInning.set(emptyPositions[i], remainingPlayers[i]);
      usedThisInning.add(remainingPlayers[i]);
    }

    // Update position streaks
    for (const playerId of ctx.playerIds) {
      const streaks = positionStreak.get(playerId)!;
      const assignedPos = Array.from(assignedThisInning.entries()).find(
        ([_, pid]) => pid === playerId
      );
      if (assignedPos) {
        const pos = assignedPos[0];
        // Increment streak for the assigned position, reset all others
        for (const p of ctx.positions) {
          if (p === pos) {
            streaks.set(p, (streaks.get(p) || 0) + 1);
          } else {
            streaks.set(p, 0);
          }
        }
      } else {
        // Not assigned this inning — reset all streaks
        for (const p of ctx.positions) {
          streaks.set(p, 0);
        }
      }
    }

    // Update innings assigned
    Array.from(assignedThisInning.entries()).forEach(([_, playerId]) => {
      inningsAssigned.set(playerId, (inningsAssigned.get(playerId) || 0) + 1);
    });

    // Convert to assignment objects
    Array.from(assignedThisInning.entries()).forEach(([pos, playerId]) => {
      assignments.push({
        inningNumber: inning,
        position: pos,
        playerId,
        assignmentType: "planned",
      });
    });
  }

  return assignments;
}

function pickBestForPosition(
  position: Position,
  inning: number,
  ctx: FieldingContext,
  usedThisInning: Set<string>,
  positionStreak: Map<string, Map<Position, number>>,
  inningsAssigned: Map<string, number>,
  weights: ModeWeights
): string | null {
  const isOutfield = ctx.outfieldPositions.includes(position);

  const candidates = ctx.playerIds.filter((id) => {
    if (usedThisInning.has(id)) return false;
    // CORE RULE: no player at the same position for more than 2 consecutive innings
    const streak = positionStreak.get(id)?.get(position) || 0;
    if (streak >= 2) return false;
    return true;
  });

  if (candidates.length === 0) {
    // Fallback: relax the streak rule and pick anyone not yet used
    const fallback = ctx.playerIds.filter((id) => !usedThisInning.has(id));
    if (fallback.length === 0) return null;
    // Pick the one with lowest streak at this position
    fallback.sort((a, b) => {
      const sa = positionStreak.get(a)?.get(position) || 0;
      const sb = positionStreak.get(b)?.get(position) || 0;
      return sa - sb;
    });
    return fallback[0];
  }

  const scored = candidates.map((id) => {
    const suit = ctx.suitabilities.get(id)!;
    const hist = ctx.histories.get(id);

    // Base suitability for this position
    const suitScore = positionScore(suit, position);

    // Fairness: prefer players with fewer innings assigned so far
    const totalInnings = inningsAssigned.get(id) || 0;
    const maxPossible = INNINGS.length;
    const fairnessScore = 1 - totalInnings / maxPossible;

    // Development: younger/weaker players get bonus for outfield,
    // stronger/older get bonus for key infield
    let devScore = 0;
    if (isOutfield) {
      // Younger players get strong outfield bonus
      if (suit.ageOnGameDate < 10) devScore += 0.6;
      // Weaker fielders get outfield bonus (outfield is more forgiving)
      if (suit.battingTier === "weaker") devScore += 0.4;
      // Lower fielding score = more outfield
      devScore += (5 - suit.pitcherScore) * 0.1;
    } else {
      // Infield: prefer better fielders
      if (suit.ageOnGameDate >= 10) devScore += 0.3;
    }

    // History: prefer positions the player hasn't played much
    let histScore = 0;
    if (hist) {
      const posCount = hist.positionCounts[position] || 0;
      const totalPosInnings = Object.values(hist.positionCounts).reduce(
        (a, b) => a + b, 0
      );
      histScore = totalPosInnings > 0 ? 1 - posCount / totalPosInnings : 0.5;
    }

    // Streak penalty: if already at this position for 1 inning, penalize
    // to encourage rotation even before hitting the hard cap of 2
    const currentStreak = positionStreak.get(id)?.get(position) || 0;
    const streakPenalty = currentStreak * 0.8;

    const total =
      suitScore * weights.suitability * 2 +
      fairnessScore * weights.fairness * 2 +
      devScore * weights.development * 2 +
      histScore * weights.fairness -
      streakPenalty +
      Math.random() * 0.2;

    return { id, score: total };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.id ?? null;
}

function planCatcherBlocks(ctx: FieldingContext): Map<number, string> {
  const plan = new Map<number, string>();

  const catcherCandidates = ctx.playerIds
    .map((id) => ({
      id,
      score: ctx.suitabilities.get(id)!.catcherScore,
      hist: ctx.histories.get(id),
    }))
    .sort((a, b) => {
      const aConsec = a.hist?.consecutiveGamesCaught ?? 0;
      const bConsec = b.hist?.consecutiveGamesCaught ?? 0;
      if (aConsec !== bConsec) return aConsec - bConsec;
      const aTotal = a.hist?.totalCatcherInnings ?? 0;
      const bTotal = b.hist?.totalCatcherInnings ?? 0;
      if (aTotal !== bTotal) return aTotal - bTotal;
      return b.score - a.score;
    });

  if (catcherCandidates.length === 0) return plan;

  const lockedCatcherInnings = new Set<number>();
  for (const inning of INNINGS) {
    const key = makeFieldingKey(inning, "C");
    const locked = ctx.lockedFielding.get(key);
    if (locked) {
      plan.set(inning, locked.playerId);
      lockedCatcherInnings.add(inning);
    }
  }

  const unlockedInnings = INNINGS.filter((i) => !lockedCatcherInnings.has(i));
  if (unlockedInnings.length === 0) return plan;

  // Max 2 consecutive innings per catcher
  const blockSizes = splitIntoBlocks(unlockedInnings.length, 2);
  let inningIdx = 0;
  let catcherIdx = 0;

  for (const blockSize of blockSizes) {
    const catcherId = catcherCandidates[catcherIdx % catcherCandidates.length].id;
    for (let i = 0; i < blockSize && inningIdx < unlockedInnings.length; i++) {
      plan.set(unlockedInnings[inningIdx], catcherId);
      inningIdx++;
    }
    catcherIdx++;
  }

  return plan;
}

function splitIntoBlocks(total: number, maxBlock: number): number[] {
  if (total <= maxBlock) return [total];
  const blocks: number[] = [];
  let remaining = total;
  while (remaining > 0) {
    const size = Math.min(maxBlock, remaining);
    blocks.push(size);
    remaining -= size;
  }
  return blocks;
}

// ─── Batting Order Generation ──────────────────────────────────────────

export function generateBattingOrder(
  playerIds: string[],
  suitabilities: Map<string, PlayerSuitability>,
  histories: Map<string, PlayerHistory>,
  mode: CoachMode,
  lockedBatting?: { slot: number; playerId: string }[]
): BattingOrderEntry[] {
  const lockedSlots = new Map<number, string>();
  const lockedPlayers = new Set<string>();

  if (lockedBatting) {
    for (const { slot, playerId } of lockedBatting) {
      lockedSlots.set(slot, playerId);
      lockedPlayers.add(playerId);
    }
  }

  const unlockedPlayers = playerIds.filter((id) => !lockedPlayers.has(id));
  const totalSlots = playerIds.length;
  const unlockedSlotNumbers: number[] = [];

  for (let i = 1; i <= totalSlots; i++) {
    if (!lockedSlots.has(i)) {
      unlockedSlotNumbers.push(i);
    }
  }

  // Separate into tiers
  const strong: string[] = [];
  const medium: string[] = [];
  const weaker: string[] = [];

  for (const id of unlockedPlayers) {
    const suit = suitabilities.get(id)!;
    if (suit.battingTier === "strong") strong.push(id);
    else if (suit.battingTier === "medium") medium.push(id);
    else weaker.push(id);
  }

  // Sort each tier by historical batting position to rotate
  // Players who batted later last time should bat earlier this time
  sortByHistoryRotation(strong, histories);
  sortByHistoryRotation(medium, histories);
  sortByHistoryRotation(weaker, histories);

  // Interleave: spread strong batters, separate weaker batters
  const orderedPlayers = interleaveWithSeparation(strong, medium, weaker, totalSlots);

  const result: BattingOrderEntry[] = [];
  Array.from(lockedSlots.entries()).forEach(([slot, playerId]) => {
    result.push({ battingSlot: slot, playerId });
  });
  for (let i = 0; i < Math.min(orderedPlayers.length, unlockedSlotNumbers.length); i++) {
    result.push({ battingSlot: unlockedSlotNumbers[i], playerId: orderedPlayers[i] });
  }

  result.sort((a, b) => a.battingSlot - b.battingSlot);
  return result;
}

/**
 * Sort players within a tier so that those who batted later in
 * previous games move toward the front (earlier slots) this time.
 * This creates natural rotation game-to-game.
 */
function sortByHistoryRotation(players: string[], histories: Map<string, PlayerHistory>): void {
  players.sort((a, b) => {
    const histA = histories.get(a);
    const histB = histories.get(b);

    // Players who were at the bottom last time get moved up
    const lastSlotA = histA?.lastBattingSlot ?? 0;
    const lastSlotB = histB?.lastBattingSlot ?? 0;

    // Higher last slot = should bat earlier now (lower slot number)
    if (lastSlotA !== lastSlotB) return lastSlotB - lastSlotA;

    // Break ties with average historical slot
    const avgA = histA && histA.battingSlots.length > 0
      ? histA.battingSlots.reduce((sum, s) => sum + s, 0) / histA.battingSlots.length
      : 5;
    const avgB = histB && histB.battingSlots.length > 0
      ? histB.battingSlots.reduce((sum, s) => sum + s, 0) / histB.battingSlots.length
      : 5;

    if (avgA !== avgB) return avgB - avgA;

    // Final tiebreaker: random
    return Math.random() - 0.5;
  });
}

/**
 * Place players so that:
 * 1. Strong batters are spread throughout (not clumped)
 * 2. Two or more weaker batters never appear back-to-back
 * 3. Medium batters fill gaps
 */
function interleaveWithSeparation(
  strong: string[],
  medium: string[],
  weaker: string[],
  totalSlots: number
): string[] {
  const total = strong.length + medium.length + weaker.length;
  if (total === 0) return [];

  const result = new Array<string | null>(total).fill(null);

  // Step 1: Place strong batters evenly spaced
  if (strong.length > 0) {
    const spacing = Math.max(1, Math.floor(total / (strong.length + 1)));
    for (let i = 0; i < strong.length; i++) {
      const targetIdx = Math.min((i + 1) * spacing - 1, total - 1);
      // Find closest empty slot to target
      let placed = false;
      for (let offset = 0; offset < total && !placed; offset++) {
        for (const dir of [0, 1, -1]) {
          const idx = targetIdx + offset * (dir || 1);
          if (idx >= 0 && idx < total && result[idx] === null) {
            result[idx] = strong[i];
            placed = true;
            break;
          }
        }
      }
    }
  }

  // Step 2: Place weaker batters in remaining slots, ensuring no two are adjacent
  const weakerSet = new Set(weaker);
  let weakerIdx = 0;
  for (let i = 0; i < total && weakerIdx < weaker.length; i++) {
    if (result[i] !== null) continue;

    // Check if placing a weaker batter here would create back-to-back
    const prevIsWeaker = i > 0 && result[i - 1] !== null && weakerSet.has(result[i - 1]!);
    if (!prevIsWeaker) {
      result[i] = weaker[weakerIdx];
      weakerIdx++;
    }
  }

  // If we couldn't place all weaker batters without adjacency, place remaining anyway
  for (let i = 0; i < total && weakerIdx < weaker.length; i++) {
    if (result[i] === null) {
      result[i] = weaker[weakerIdx];
      weakerIdx++;
    }
  }

  // Step 3: Fill remaining spots with medium batters
  let medIdx = 0;
  for (let i = 0; i < total && medIdx < medium.length; i++) {
    if (result[i] === null) {
      result[i] = medium[medIdx];
      medIdx++;
    }
  }

  // Step 4: Final pass — swap any remaining consecutive weaker batters
  for (let i = 0; i < total - 1; i++) {
    if (
      result[i] && result[i + 1] &&
      weakerSet.has(result[i]!) && weakerSet.has(result[i + 1]!)
    ) {
      // Find a non-weaker batter to swap with
      for (let j = i + 2; j < total; j++) {
        if (result[j] && !weakerSet.has(result[j]!)) {
          [result[i + 1], result[j]] = [result[j], result[i + 1]];
          break;
        }
      }
    }
  }

  return result.filter((p): p is string => p !== null);
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ─── Full Lineup Generation ───────────────────────────────────────────

export function generateFullLineup(
  players: PlayerData[],
  gameDate: Date,
  mode: CoachMode,
  defensiveFormat: DefensiveFormat,
  histories: Map<string, PlayerHistory>,
  lockedBatting?: { slot: number; playerId: string }[],
  lockedFielding?: { inning: number; position: Position; playerId: string }[]
): LineupData {
  const playerIds = players.map((p) => p.id);
  const suitabilities = new Map<string, PlayerSuitability>();
  for (const p of players) {
    suitabilities.set(p.id, computeSuitability(p, gameDate));
  }

  const positions = getPositionsForFormat(defensiveFormat);
  const outfieldPositions = getOutfieldPositions(defensiveFormat);

  const lockedFieldingMap = new Map<string, { playerId: string }>();
  if (lockedFielding) {
    for (const { inning, position, playerId } of lockedFielding) {
      lockedFieldingMap.set(makeFieldingKey(inning, position), { playerId });
    }
  }

  const fieldingCtx: FieldingContext = {
    playerIds,
    positions,
    outfieldPositions,
    suitabilities,
    histories,
    mode,
    lockedFielding: lockedFieldingMap,
  };

  const fieldingAssignments = generateFieldingPlan(fieldingCtx);
  const battingOrder = generateBattingOrder(playerIds, suitabilities, histories, mode, lockedBatting);

  return { battingOrder, fieldingAssignments };
}

// ─── History Helpers ──────────────────────────────────────────────────

export function buildEmptyHistory(playerId: string): PlayerHistory {
  return {
    playerId,
    battingSlots: [],
    lastBattingSlot: null,
    wasLastInOrder: false,
    wasInBottom3: false,
    positionCounts: {},
    totalCatcherInnings: 0,
    consecutiveGamesCaught: 0,
    totalInfieldInnings: 0,
    totalOutfieldInnings: 0,
  };
}
