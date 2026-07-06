export type MatchOutcomeDb = "p1_win" | "p2_win" | "draw";

export interface Player {
  id: string;
  name: string;
  created_at: string;
}

export interface Season {
  id: string;
  label: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

export interface PlayerSeasonStats {
  player_id: string;
  season_id: string;
  rating: number;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface Match {
  id: string;
  season_id: string;
  player1_id: string;
  player2_id: string;
  outcome: MatchOutcomeDb;
  p1_rating_before: number;
  p1_rating_after: number;
  p2_rating_before: number;
  p2_rating_after: number;
  recorded_at: string;
}

export interface MatchWithPlayers extends Match {
  player1: { id: string; name: string } | null;
  player2: { id: string; name: string } | null;
}

export interface LeaderboardRow extends PlayerSeasonStats {
  player_name: string;
}
