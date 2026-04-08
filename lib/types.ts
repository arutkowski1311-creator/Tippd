// ─── Defensive Formats ─────────────────────────────────────────────────

export type DefensiveFormat = "standard" | "four_outfield" | "five_outfield";

export const DEFENSIVE_FORMATS: Record<DefensiveFormat, { label: string; positions: Position[] }> = {
  standard: {
    label: "3 Outfielders (LF, CF, RF)",
    positions: ["P", "C", "1B", "2B", "SS", "3B", "LF", "CF", "RF"],
  },
  four_outfield: {
    label: "4 Outfielders (LF, LC, RC, RF)",
    positions: ["P", "C", "1B", "2B", "SS", "3B", "LF", "LC", "RC", "RF"],
  },
  five_outfield: {
    label: "5 Outfielders",
    positions: ["P", "C", "1B", "2B", "SS", "3B", "LF", "LCF", "CF", "RCF", "RF"],
  },
};

export const ALL_POSITIONS = [
  "P", "C", "1B", "2B", "SS", "3B", "LF", "LC", "RC", "RF", "CF", "LCF", "RCF",
] as const;

export type Position = (typeof ALL_POSITIONS)[number];

// Backward compat: default 4-outfielder layout
export const POSITIONS: readonly Position[] = DEFENSIVE_FORMATS.four_outfield.positions;

export function getPositionsForFormat(format: DefensiveFormat): Position[] {
  return DEFENSIVE_FORMATS[format].positions;
}

export function getOutfieldPositions(format: DefensiveFormat): Position[] {
  const all = DEFENSIVE_FORMATS[format].positions;
  return all.filter((p) => !["P", "C", "1B", "2B", "SS", "3B"].includes(p));
}

export function getInfieldPositions(): Position[] {
  return ["P", "C", "1B", "2B", "SS", "3B"];
}

export const PRIORITY_POSITIONS: Position[] = ["P", "1B", "3B"];

export const INFIELD_POSITIONS: Position[] = ["P", "C", "1B", "2B", "SS", "3B"];

export const INNINGS = [1, 2, 3, 4, 5, 6] as const;
export type InningNumber = (typeof INNINGS)[number];

export type HalfInning = "top" | "bottom";

export type CoachMode = "balanced" | "development" | "win-now";

export type GameStatus = "scheduled" | "live" | "final";

export type AssignmentType = "planned" | "actual";

export type HomeOrAway = "home" | "away";

// ─── User & Auth Types ─────────────────────────────────────────────────

export type TeamRole = "head_coach" | "assistant_coach" | "scorekeeper" | "parent" | "admin" | "member";

export interface UserData {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface TeamMembershipData {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  status: string;
  user?: UserData;
}

// ─── Player Types ──────────────────────────────────────────────────────

export interface PlayerRatings {
  fieldingOverall: number;
  catching: number;
  throwing: number;
  battingOverall: number;
}

export interface PlayerData {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  jerseyNumber: string | null;
  fieldingOverall: number;
  catching: number;
  throwing: number;
  battingOverall: number;
  profileImageUrl: string | null;
  active: boolean;
  teamId: string;
}

// ─── Game Types ────────────────────────────────────────────────────────

export interface GameData {
  id: string;
  teamId: string;
  opponentName: string;
  gameDate: string;
  homeOrAway: HomeOrAway;
  venue: string | null;
  defensiveFormat: DefensiveFormat;
  coachMode: CoachMode;
  lineupLocked: boolean;
  simpleModeEnabled: boolean;
  advancedModeEnabled: boolean;
  gameStatus: GameStatus;
  currentInning: number;
  currentHalf: HalfInning;
  currentOuts: number;
  currentBatterId: string | null;
  currentPitcherId: string | null;
  runnersJson: string | null;
  finalTeamScore: number | null;
  finalOpponentScore: number | null;
  livestreamUrl: string | null;
  recapStatus: string | null;
  recapText: string | null;
  notes: string | null;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BattingOrderEntry {
  battingSlot: number;
  playerId: string;
  player?: PlayerData;
}

export interface FieldingAssignment {
  inningNumber: number;
  position: Position;
  playerId: string;
  assignmentType: AssignmentType;
  locked?: boolean;
}

export interface LineupData {
  battingOrder: BattingOrderEntry[];
  fieldingAssignments: FieldingAssignment[];
}

export interface LiveGameState {
  currentInning: number;
  currentHalf: HalfInning;
  currentOuts: number;
  gameStatus: GameStatus;
  finalTeamScore: number | null;
  finalOpponentScore: number | null;
  runnersJson: string | null;
  currentBatterId: string | null;
  currentPitcherId: string | null;
  scoreByInning: ScoreByInning[];
  totalUsRuns: number;
  totalOppRuns: number;
}

export interface ScoreByInning {
  inningNumber: number;
  half: HalfInning;
  usRuns: number;
  opponentRuns: number;
  outsRecorded: number;
  completed: boolean;
}

export interface RunnersState {
  first: string | null;
  second: string | null;
  third: string | null;
}

// ─── Advanced Scorebook Types ──────────────────────────────────────────

export type PitchResult =
  | "ball"
  | "strike_called"
  | "strike_swinging"
  | "foul"
  | "in_play"
  | "hbp";

export type PlateAppearanceResult =
  | "strikeout"
  | "walk"
  | "single"
  | "double"
  | "triple"
  | "homerun"
  | "error"
  | "fc"
  | "hbp"
  | "sac_fly"
  | "sac_bunt"
  | "ground_out"
  | "fly_out"
  | "line_out"
  | "pop_out"
  | "double_play"
  | "triple_play"
  | "reached_on_error";

export type ContactType = "ground_ball" | "line_drive" | "fly_ball" | "pop_up" | "bunt";

export type PlayResult =
  | "caught"
  | "safe"
  | "error"
  | "out_at_first"
  | "force_out"
  | "tag_out"
  | "double_play"
  | "no_play";

export interface PlateAppearanceData {
  id: string;
  gameId: string;
  inningNumber: number;
  half: HalfInning;
  battingTeam: "us" | "opponent";
  batterPlayerId: string | null;
  batterOpponentPlayerId: string | null;
  battingOrderSlot: number | null;
  pitcherPlayerId: string | null;
  pitcherOpponentPlayerId: string | null;
  balls: number;
  strikes: number;
  resultType: PlateAppearanceResult | null;
  rbiCount: number;
  outsRecorded: number;
  notes: string | null;
  sourceType: string;
}

export interface PitchEventData {
  id: string;
  plateAppearanceId: string;
  pitchNumber: number;
  pitchResult: PitchResult;
}

// ─── Stats Types ───────────────────────────────────────────────────────

export interface BattingStats {
  games: number;
  plateAppearances: number;
  atBats: number;
  runs: number;
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbi: number;
  walks: number;
  strikeouts: number;
  hbp: number;
  battingAverage: number;
  obp: number;
  slg: number;
  ops: number;
}

export interface FieldingStats {
  innings: Record<Position, number>;
  totalInnings: number;
  infieldInnings: number;
  outfieldInnings: number;
  catcherInnings: number;
  pitcherInnings: number;
}

export interface PitchingStats {
  appearances: number;
  inningsPitched: number;
  pitchesThrown: number;
  strikeouts: number;
  walks: number;
  hitsAllowed: number;
  runsAllowed: number;
}

export interface PlayerSeasonStats {
  batting: BattingStats;
  fielding: FieldingStats;
  pitching: PitchingStats;
}

// ─── Media Types ───────────────────────────────────────────────────────

export interface MediaItemData {
  id: string;
  teamId: string;
  gameId: string | null;
  playerId: string | null;
  mediaType: "photo" | "video";
  storageKey: string;
  thumbnailUrl: string | null;
  caption: string | null;
  visibility: "team" | "family" | "public";
  createdAt: string;
}

// ─── Award Types ───────────────────────────────────────────────────────

export interface PlayerAwardData {
  id: string;
  gameId: string;
  playerId: string | null;
  awardType: "player_of_game" | "team_of_game" | "custom";
  headline: string | null;
  subtext: string | null;
  cardImageUrl: string | null;
  player?: PlayerData;
}

// ─── Lineup Engine Types ───────────────────────────────────────────────

export interface PlayerSuitability {
  playerId: string;
  pitcherScore: number;
  firstBaseScore: number;
  thirdBaseScore: number;
  catcherScore: number;
  shortstopScore: number;
  secondBaseScore: number;
  outfieldScore: number;
  battingTier: "strong" | "medium" | "weaker";
  ageOnGameDate: number;
}

export interface PlayerHistory {
  playerId: string;
  battingSlots: number[];
  lastBattingSlot: number | null;
  wasLastInOrder: boolean;
  wasInBottom3: boolean;
  positionCounts: Record<string, number>;
  totalCatcherInnings: number;
  consecutiveGamesCaught: number;
  totalInfieldInnings: number;
  totalOutfieldInnings: number;
}

export interface GenerateLineupRequest {
  gameId: string;
  playerIds: string[];
  coachMode: CoachMode;
  defensiveFormat: DefensiveFormat;
  lockedBatting?: { slot: number; playerId: string }[];
  lockedFielding?: { inning: number; position: Position; playerId: string }[];
}

export interface ValidationWarning {
  type: "error" | "warning";
  message: string;
  inning?: number;
  position?: Position;
  playerId?: string;
}

export interface ImportedPlayer {
  firstName: string;
  lastName: string;
  dob: string;
  jerseyNumber?: string;
}

// ─── Notification Types ────────────────────────────────────────────────

export type NotificationChannel = "in_app" | "email" | "push" | "sms";

export interface NotificationData {
  id: string;
  teamId: string | null;
  gameId: string | null;
  channel: NotificationChannel;
  templateKey: string;
  status: string;
  createdAt: string;
}

// ─── Event Types for State Machine ─────────────────────────────────────

export type GameEventType =
  | "add_out"
  | "remove_out"
  | "add_run_us"
  | "remove_run_us"
  | "add_run_opponent"
  | "remove_run_opponent"
  | "advance_half"
  | "set_batter"
  | "set_pitcher"
  | "pitch_ball"
  | "pitch_strike"
  | "pitch_foul"
  | "ball_in_play"
  | "base_runner_update"
  | "lineup_edit"
  | "fielding_edit"
  | "pitcher_change"
  | "finalize_game"
  | "media_uploaded"
  | "player_award_assigned";
