import { createClient } from "@/lib/supabase/server";
import type { EventRow, LeaderboardRow, Match, Player, Pod, Round, Season } from "@/lib/types";

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
    byes_received: row.byes_received as number,
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

/** All recorded (non-pending) matches a player has played, most recent first. */
export async function getPlayerMatchHistory(playerId: string) {
  const supabase = await createClient();

  const baseSelect = "*, player1:player1_id(id, name), player2:player2_id(id, name), rounds(round_number, pod_id)";
  const [asP1, asP2] = await Promise.all([
    supabase.from("matches").select(baseSelect).eq("player1_id", playerId).not("outcome", "is", null),
    supabase.from("matches").select(baseSelect).eq("player2_id", playerId).not("outcome", "is", null),
  ]);
  if (asP1.error) throw asP1.error;
  if (asP2.error) throw asP2.error;

  type MatchWithJoins = Match & {
    player1: { id: string; name: string } | null;
    player2: { id: string; name: string } | null;
    rounds: { round_number: number; pod_id: string } | null;
  };
  const merged = [...(asP1.data as MatchWithJoins[]), ...(asP2.data as MatchWithJoins[])];
  const podIds = [...new Set(merged.map((m) => m.rounds?.pod_id).filter((id): id is string => !!id))];

  const { data: pods, error: podsError } = podIds.length
    ? await supabase.from("pods").select("id, event_id").in("id", podIds)
    : { data: [] as { id: string; event_id: string }[], error: null };
  if (podsError) throw podsError;
  const eventIds = [...new Set(pods.map((p) => p.event_id))];

  const { data: events, error: eventsError } = eventIds.length
    ? await supabase.from("events").select("id, event_date").in("id", eventIds)
    : { data: [] as { id: string; event_date: string }[], error: null };
  if (eventsError) throw eventsError;

  const eventDateByPodId = new Map(
    pods.map((p) => [p.id, events.find((e) => e.id === p.event_id)?.event_date ?? null]),
  );

  return merged
    .map((m) => ({ ...m, event_date: m.rounds ? eventDateByPodId.get(m.rounds.pod_id) ?? null : null }))
    .sort((a, b) => ((a.recorded_at ?? "") < (b.recorded_at ?? "") ? 1 : -1));
}

export async function getEvent(eventId: string): Promise<EventRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPod(podId: string): Promise<Pod | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("pods").select("*").eq("id", podId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPodRounds(podId: string): Promise<Round[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rounds")
    .select("*")
    .eq("pod_id", podId)
    .order("round_number", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getRoundMatches(roundId: string): Promise<Match[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("matches").select("*").eq("round_id", roundId);
  if (error) throw error;
  return data;
}

/** Every match across every round of a pod — used to compute standings state for the next round. */
export async function getPodMatches(podId: string): Promise<Match[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("*, rounds!inner(pod_id)")
    .eq("rounds.pod_id", podId);
  if (error) throw error;
  return data as unknown as Match[];
}

export async function getRecentEvents(seasonId: string, limit = 10) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*, pods(id)")
    .eq("season_id", seasonId)
    .order("event_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}
