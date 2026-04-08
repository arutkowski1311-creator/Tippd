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
// Uses block-based rotation: 6 innings split into 3 blocks of 2.
// Every player MUST change position between blocks.
// This guarantees max 2 consecutive innings at any position.

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

export function generateFieldingPlan(ctx: FieldingContext): FieldingAssignment[] {
  const weights = getModeWeights(ctx.mode);
  const assignments: FieldingAssignment[] = [];
  const numPlayers = ctx.playerIds.length;
  const numPositions = ctx.positions.length;

  // Split 6 innings into 3 blocks of 2
  const blocks: number[][] = [[1, 2], [3, 4], [5, 6]];

  // For each block, create a complete assignment (player -> position)
  // Between blocks, every player must change position
  const blockAssignments: Map<string, Position>[] = []; // playerId -> position per block

  for (let blockIdx = 0; blockIdx < blocks.length; blockIdx++) {
    const prevAssignment = blockIdx > 0 ? blockAssignments[blockIdx - 1] : null;

    // Score each (player, position) pair
    const scores: { playerId: string; position: Position; score: number }[] = [];

    for (const playerId of ctx.playerIds) {
      const suit = ctx.suitabilities.get(playerId)!;
      const hist = ctx.histories.get(playerId);
      const prevPos = prevAssignment?.get(playerId);

      for (const pos of ctx.positions) {
        // HARD RULE: can't stay at same position between blocks
        if (prevPos === pos) continue;

        const isOutfield = ctx.outfieldPositions.includes(pos);

        // Base suitability
        let score = positionScore(suit, pos) * weights.suitability * 2;

        // Development: younger/weaker players get outfield bonus
        if (isOutfield) {
          if (suit.ageOnGameDate < 10) score += 0.6 * weights.development;
          if (suit.battingTier === "weaker") score += 0.4 * weights.development;
        }

        // History: prefer positions played less
        if (hist) {
          const posCount = hist.positionCounts[pos] || 0;
          const totalPos = Object.values(hist.positionCounts).reduce((a, b) => a + b, 0);
          if (totalPos > 0) {
            score += (1 - posCount / totalPos) * weights.fairness;
          }
        }

        // Variety bonus: avoid positions from 2 blocks ago too
        if (blockIdx >= 2) {
          const twoBlocksAgoPos = blockAssignments[blockIdx - 2]?.get(playerId);
          if (twoBlocksAgoPos === pos) score -= 0.5;
        }

        // Small randomness for variety
        score += Math.random() * 0.15;

        scores.push({ playerId, position: pos, score });
      }
    }

    // Greedy assignment: pick highest-scored pairs, ensuring each player
    // and each position is used at most once
    scores.sort((a, b) => b.score - a.score);

    const assignedPlayers = new Set<string>();
    const assignedPositions = new Set<Position>();
    const blockMap = new Map<string, Position>();

    for (const { playerId, position, score } of scores) {
      if (assignedPlayers.has(playerId)) continue;
      if (assignedPositions.has(position)) continue;

      blockMap.set(playerId, position);
      assignedPlayers.add(playerId);
      assignedPositions.add(position);

      if (assignedPlayers.size >= Math.min(numPlayers, numPositions)) break;
    }

    // If some positions still unassigned (shouldn't happen normally),
    // force-assign remaining players
    const emptyPositions = ctx.positions.filter((p) => !assignedPositions.has(p));
    const remainingPlayers = ctx.playerIds.filter((id) => !assignedPlayers.has(id));
    for (let i = 0; i < Math.min(emptyPositions.length, remainingPlayers.length); i++) {
      blockMap.set(remainingPlayers[i], emptyPositions[i]);
    }

    blockAssignments.push(blockMap);

    // Create assignments for both innings in this block
    for (const inning of blocks[blockIdx]) {
      for (const [playerId, position] of Array.from(blockMap.entries())) {
        // Check for locked overrides
        const key = makeFieldingKey(inning, position);
        const locked = ctx.lockedFielding.get(key);
        if (locked && locked.playerId !== playerId) continue;

        assignments.push({
          inningNumber: inning,
          position,
          playerId,
          assignmentType: "planned",
        });
      }
    }
  }

  return assignments;
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
  sortByHistoryRotation(strong, histories);
  sortByHistoryRotation(medium, histories);
  sortByHistoryRotation(weaker, histories);

  // Interleave: spread strong batters, separate weaker batters
  const orderedPlayers = interleaveWithSeparation(strong, medium, weaker);

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

function sortByHistoryRotation(players: string[], histories: Map<string, PlayerHistory>): void {
  players.sort((a, b) => {
    const histA = histories.get(a);
    const histB = histories.get(b);

    const lastSlotA = histA?.lastBattingSlot ?? 0;
    const lastSlotB = histB?.lastBattingSlot ?? 0;

    // Higher last slot = should bat earlier now
    if (lastSlotA !== lastSlotB) return lastSlotB - lastSlotA;

    const avgA = histA && histA.battingSlots.length > 0
      ? histA.battingSlots.reduce((sum, s) => sum + s, 0) / histA.battingSlots.length
      : 5;
    const avgB = histB && histB.battingSlots.length > 0
      ? histB.battingSlots.reduce((sum, s) => sum + s, 0) / histB.battingSlots.length
      : 5;

    if (avgA !== avgB) return avgB - avgA;
    return Math.random() - 0.5;
  });
}

function interleaveWithSeparation(
  strong: string[],
  medium: string[],
  weaker: string[]
): string[] {
  const total = strong.length + medium.length + weaker.length;
  if (total === 0) return [];

  const result = new Array<string | null>(total).fill(null);
  const weakerSet = new Set(weaker);

  // Place strong batters evenly spaced
  if (strong.length > 0) {
    const spacing = Math.max(1, Math.floor(total / (strong.length + 1)));
    for (let i = 0; i < strong.length; i++) {
      const targetIdx = Math.min((i + 1) * spacing - 1, total - 1);
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

  // Place weaker batters ensuring no two are adjacent
  let weakerIdx = 0;
  for (let i = 0; i < total && weakerIdx < weaker.length; i++) {
    if (result[i] !== null) continue;
    const prevIsWeaker = i > 0 && result[i - 1] !== null && weakerSet.has(result[i - 1]!);
    if (!prevIsWeaker) {
      result[i] = weaker[weakerIdx];
      weakerIdx++;
    }
  }
  // Place remaining weaker if couldn't avoid adjacency
  for (let i = 0; i < total && weakerIdx < weaker.length; i++) {
    if (result[i] === null) {
      result[i] = weaker[weakerIdx];
      weakerIdx++;
    }
  }

  // Fill remaining with medium
  let medIdx = 0;
  for (let i = 0; i < total && medIdx < medium.length; i++) {
    if (result[i] === null) {
      result[i] = medium[medIdx];
      medIdx++;
    }
  }

  // Final pass: swap consecutive weaker batters
  for (let i = 0; i < total - 1; i++) {
    if (result[i] && result[i + 1] && weakerSet.has(result[i]!) && weakerSet.has(result[i + 1]!)) {
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
