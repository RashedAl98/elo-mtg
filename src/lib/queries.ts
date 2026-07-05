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
    ? await supabase.from("events").select("id, event_date, season_id").in("id", eventIds)
    : { data: [] as { id: string; event_date: string; season_id: string }[], error: null };
  if (eventsError) throw eventsError;

  const eventByPodId = new Map(pods.map((p) => [p.id, events.find((e) => e.id === p.event_id) ?? null]));

  return merged
    .map((m) => {
      const event = m.rounds ? eventByPodId.get(m.rounds.pod_id) ?? null : null;
      return { ...m, event_date: event?.event_date ?? null, season_id: event?.season_id ?? null };
    })
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

/** All recorded matches for a season, each tagged with its event_date. */
export async function getSeasonMatches(
  seasonId: string,
): Promise<Array<Match & { event_date: string }>> {
  const supabase = await createClient();

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id, event_date")
    .eq("season_id", seasonId);
  if (eventsError) throw eventsError;
  if (events.length === 0) return [];

  const { data: pods, error: podsError } = await supabase
    .from("pods")
    .select("id, event_id")
    .in("event_id", events.map((e) => e.id));
  if (podsError) throw podsError;
  if (pods.length === 0) return [];

  const { data: rounds, error: roundsError } = await supabase
    .from("rounds")
    .select("id, pod_id")
    .in("pod_id", pods.map((p) => p.id));
  if (roundsError) throw roundsError;
  if (rounds.length === 0) return [];

  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("*")
    .in("round_id", rounds.map((r) => r.id))
    .not("outcome", "is", null);
  if (matchesError) throw matchesError;

  const eventDateById = new Map(events.map((e) => [e.id, e.event_date]));
  const eventIdByPodId = new Map(pods.map((p) => [p.id, p.event_id]));
  const podIdByRoundId = new Map(rounds.map((r) => [r.id, r.pod_id]));

  return (matches as Match[]).map((m) => {
    const podId = podIdByRoundId.get(m.round_id)!;
    const eventId = eventIdByPodId.get(podId)!;
    return { ...m, event_date: eventDateById.get(eventId)! };
  });
}

/**
 * Rating change per player from their most recent event in the season
 * (sum of their match deltas on that date). Used for leaderboard movement badges.
 */
export async function getRecentDeltas(seasonId: string): Promise<Record<string, number>> {
  const matches = await getSeasonMatches(seasonId);

  const lastEventByPlayer = new Map<string, string>();
  for (const m of matches) {
    for (const pid of [m.player1_id, m.player2_id]) {
      if (!pid) continue;
      const current = lastEventByPlayer.get(pid);
      if (!current || m.event_date > current) lastEventByPlayer.set(pid, m.event_date);
    }
  }

  const deltas: Record<string, number> = {};
  for (const m of matches) {
    if (m.outcome === "bye" || m.p1_rating_after === null) continue;
    if (lastEventByPlayer.get(m.player1_id) === m.event_date) {
      deltas[m.player1_id] = (deltas[m.player1_id] ?? 0) + (m.p1_rating_after! - m.p1_rating_before!);
    }
    if (m.player2_id && lastEventByPlayer.get(m.player2_id) === m.event_date) {
      deltas[m.player2_id] = (deltas[m.player2_id] ?? 0) + (m.p2_rating_after! - m.p2_rating_before!);
    }
  }
  return deltas;
}
