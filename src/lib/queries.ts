import { createClient } from "@/lib/supabase/server";
import type { LeaderboardRow, Match, MatchWithPlayers, Player, Season } from "@/lib/types";

export async function getSeasons(): Promise<Season[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("seasons").select("*").order("start_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getActiveSeason(): Promise<Season | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("seasons").select("*").eq("is_active", true).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getLeaderboard(seasonId: string): Promise<LeaderboardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("player_season_stats")
    .select("*, players(name)")
    .eq("season_id", seasonId)
    .order("rating", { ascending: false });
  if (error) throw error;
  return (data as unknown as Array<Record<string, unknown> & { players: { name: string } }>).map((row) => ({
    player_id: row.player_id as string,
    season_id: row.season_id as string,
    rating: row.rating as number,
    games_played: row.games_played as number,
    wins: row.wins as number,
    losses: row.losses as number,
    draws: row.draws as number,
    player_name: row.players.name,
  }));
}

export async function getAllPlayers(): Promise<Player[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("players").select("*").order("name", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getPlayer(playerId: string): Promise<Player | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("players").select("*").eq("id", playerId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPlayerSeasonHistory(playerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("player_season_stats")
    .select("*, seasons(label, start_date, is_active)")
    .eq("player_id", playerId)
    .order("season_id", { ascending: false });
  if (error) throw error;
  return data;
}

const MATCH_WITH_PLAYERS = "*, player1:player1_id(id, name), player2:player2_id(id, name)";

/** All matches a player has played, most recent first. */
export async function getPlayerMatchHistory(playerId: string): Promise<MatchWithPlayers[]> {
  const supabase = await createClient();
  const [asP1, asP2] = await Promise.all([
    supabase.from("matches").select(MATCH_WITH_PLAYERS).eq("player1_id", playerId),
    supabase.from("matches").select(MATCH_WITH_PLAYERS).eq("player2_id", playerId),
  ]);
  if (asP1.error) throw asP1.error;
  if (asP2.error) throw asP2.error;

  return [...(asP1.data as unknown as MatchWithPlayers[]), ...(asP2.data as unknown as MatchWithPlayers[])].sort(
    (a, b) => (a.recorded_at < b.recorded_at ? 1 : -1),
  );
}

/** Most recent matches in a season, with player names, newest first. */
export async function getRecentMatches(seasonId: string, limit = 15): Promise<MatchWithPlayers[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_WITH_PLAYERS)
    .eq("season_id", seasonId)
    .order("recorded_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as unknown as MatchWithPlayers[];
}

/**
 * Rating change per player from their most recent day of play in the season
 * (sum of that day's match deltas). Used for leaderboard movement badges.
 */
export async function getRecentDeltas(seasonId: string): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("matches").select("*").eq("season_id", seasonId);
  if (error) throw error;
  const matches = data as Match[];

  const day = (m: Match) => m.recorded_at.slice(0, 10);

  const lastDayByPlayer = new Map<string, string>();
  for (const m of matches) {
    for (const pid of [m.player1_id, m.player2_id]) {
      const current = lastDayByPlayer.get(pid);
      if (!current || day(m) > current) lastDayByPlayer.set(pid, day(m));
    }
  }

  const deltas: Record<string, number> = {};
  for (const m of matches) {
    if (lastDayByPlayer.get(m.player1_id) === day(m)) {
      deltas[m.player1_id] = (deltas[m.player1_id] ?? 0) + (m.p1_rating_after - m.p1_rating_before);
    }
    if (lastDayByPlayer.get(m.player2_id) === day(m)) {
      deltas[m.player2_id] = (deltas[m.player2_id] ?? 0) + (m.p2_rating_after - m.p2_rating_before);
    }
  }
  return deltas;
}
