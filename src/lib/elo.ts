export type MatchOutcome = "p1_2_0" | "p1_2_1" | "p2_2_0" | "p2_2_1" | "draw";

export const BASE_RATING = 1500;
const PROVISIONAL_K = 40;
const STANDARD_K = 24;
const PROVISIONAL_GAME_THRESHOLD = 5;

/** K-factor for a player based on how many rated games they've played this season so far. */
export function kFactor(gamesPlayedThisSeason: number): number {
  return gamesPlayedThisSeason < PROVISIONAL_GAME_THRESHOLD ? PROVISIONAL_K : STANDARD_K;
}

/** Standard logistic expected score for player A against player B. */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

/** Margin-of-victory multiplier: a closer (2-1) match moves rating less than a clean sweep. */
export function movMultiplier(outcome: MatchOutcome): number {
  return outcome === "p1_2_1" || outcome === "p2_2_1" ? 0.75 : 1.0;
}

/** Actual score (0, 0.5, or 1) for player 1 given the match outcome. */
export function scoreForPlayer1(outcome: MatchOutcome): number {
  if (outcome === "draw") return 0.5;
  return outcome === "p1_2_0" || outcome === "p1_2_1" ? 1 : 0;
}

export interface EloUpdateInput {
  p1Rating: number;
  p2Rating: number;
  p1GamesPlayed: number;
  p2GamesPlayed: number;
  outcome: MatchOutcome;
}

export interface EloUpdateResult {
  p1RatingBefore: number;
  p2RatingBefore: number;
  p1RatingAfter: number;
  p2RatingAfter: number;
  p1Delta: number;
  p2Delta: number;
}

/**
 * Computes the new ratings for both players after a match.
 * Byes never call this — they carry no ELO update.
 */
export function applyEloUpdate({
  p1Rating,
  p2Rating,
  p1GamesPlayed,
  p2GamesPlayed,
  outcome,
}: EloUpdateInput): EloUpdateResult {
  const s1 = scoreForPlayer1(outcome);
  const s2 = 1 - s1;
  const e1 = expectedScore(p1Rating, p2Rating);
  const e2 = 1 - e1;
  const mov = movMultiplier(outcome);

  const p1Delta = Math.round(kFactor(p1GamesPlayed) * mov * (s1 - e1));
  const p2Delta = Math.round(kFactor(p2GamesPlayed) * mov * (s2 - e2));

  return {
    p1RatingBefore: p1Rating,
    p2RatingBefore: p2Rating,
    p1RatingAfter: p1Rating + p1Delta,
    p2RatingAfter: p2Rating + p2Delta,
    p1Delta,
    p2Delta,
  };
}
