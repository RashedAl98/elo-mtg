export type MatchOutcomeDb = "p1_win" | "p2_win" | "draw" | "bye";

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
  byes_received: number;
}

export interface EventRow {
  id: string;
  season_id: string;
  event_date: string;
  notes: string | null;
}

export interface Pod {
  id: string;
  event_id: string;
  seat_order: string[];
}

export interface Round {
  id: string;
  pod_id: string;
  round_number: number;
}

export interface Match {
  id: string;
  round_id: string;
  player1_id: string;
  player2_id: string | null;
  outcome: MatchOutcomeDb | null;
  p1_rating_before: number | null;
  p1_rating_after: number | null;
  p2_rating_before: number | null;
  p2_rating_after: number | null;
  recorded_at: string | null;
}

export interface LeaderboardRow extends PlayerSeasonStats {
  player_name: string;
}
