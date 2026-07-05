"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { applyEloUpdate, BASE_RATING, type MatchOutcome } from "@/lib/elo";
import { computeStandingsState, generateRound1Pairings, generateSwissPairings, type RawMatch } from "@/lib/pairing";
import type { Match, PlayerSeasonStats } from "@/lib/types";

export async function upsertPlayer(name: string): Promise<string> {
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Player name is required");

  const { data: existing, error: findError } = await supabase
    .from("players")
    .select("id")
    .eq("name", trimmed)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing.id;

  const { data, error } = await supabase.from("players").insert({ name: trimmed }).select("id").single();
  if (error) throw error;
  return data.id;
}

async function ensureSeasonStats(seasonId: string, playerIds: string[]) {
  const supabase = await createClient();
  const rows = playerIds.map((player_id) => ({ player_id, season_id: seasonId, rating: BASE_RATING }));
  const { error } = await supabase
    .from("player_season_stats")
    .upsert(rows, { onConflict: "player_id,season_id", ignoreDuplicates: true });
  if (error) throw error;
}

async function bumpByeCount(seasonId: string, playerId: string) {
  const supabase = await createClient();
  const { data, error: fetchError } = await supabase
    .from("player_season_stats")
    .select("byes_received")
    .eq("season_id", seasonId)
    .eq("player_id", playerId)
    .single();
  if (fetchError) throw fetchError;

  const { error } = await supabase
    .from("player_season_stats")
    .update({ byes_received: data.byes_received + 1 })
    .eq("season_id", seasonId)
    .eq("player_id", playerId);
  if (error) throw error;
}

async function insertRoundMatches(
  roundId: string,
  seasonId: string,
  pairings: Array<{ player1Id: string; player2Id: string }>,
  byePlayerId: string | null,
) {
  const supabase = await createClient();

  if (pairings.length > 0) {
    const rows = pairings.map((p) => ({
      round_id: roundId,
      player1_id: p.player1Id,
      player2_id: p.player2Id,
      outcome: null,
    }));
    const { error } = await supabase.from("matches").insert(rows);
    if (error) throw error;
  }

  if (byePlayerId) {
    const { error } = await supabase.from("matches").insert({
      round_id: roundId,
      player1_id: byePlayerId,
      player2_id: null,
      outcome: "bye",
      recorded_at: new Date().toISOString(),
    });
    if (error) throw error;
    await bumpByeCount(seasonId, byePlayerId);
  }
}

export async function createEventAndPod({
  seasonId,
  eventDate,
  seatOrder,
}: {
  seasonId: string;
  eventDate: string;
  seatOrder: string[];
}): Promise<string> {
  if (seatOrder.length < 4) throw new Error("Need at least 4 players to run a pod");

  const supabase = await createClient();
  await ensureSeasonStats(seasonId, seatOrder);

  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert({ season_id: seasonId, event_date: eventDate })
    .select("id")
    .single();
  if (eventError) throw eventError;

  const { data: pod, error: podError } = await supabase
    .from("pods")
    .insert({ event_id: event.id, seat_order: seatOrder })
    .select("id")
    .single();
  if (podError) throw podError;

  const { data: round, error: roundError } = await supabase
    .from("rounds")
    .insert({ pod_id: pod.id, round_number: 1 })
    .select("id")
    .single();
  if (roundError) throw roundError;

  const { pairings, byePlayerId } = generateRound1Pairings(seatOrder);
  await insertRoundMatches(round.id, seasonId, pairings, byePlayerId);

  revalidatePath("/");
  return pod.id;
}

async function getPodSeasonId(podId: string): Promise<string> {
  const supabase = await createClient();
  const { data: pod, error: podError } = await supabase.from("pods").select("event_id").eq("id", podId).single();
  if (podError) throw podError;
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("season_id")
    .eq("id", pod.event_id)
    .single();
  if (eventError) throw eventError;
  return event.season_id;
}

export async function generateNextRound(podId: string): Promise<string> {
  const supabase = await createClient();

  const { data: pod, error: podError } = await supabase.from("pods").select("*").eq("id", podId).single();
  if (podError) throw podError;
  const seasonId = await getPodSeasonId(podId);
  const seatOrder: string[] = pod.seat_order;

  const { data: rounds, error: roundsError } = await supabase
    .from("rounds")
    .select("*")
    .eq("pod_id", podId)
    .order("round_number", { ascending: true });
  if (roundsError) throw roundsError;

  const currentRoundNumber = rounds[rounds.length - 1].round_number;
  if (currentRoundNumber >= 3) throw new Error("This pod has already completed all 3 rounds");

  const roundIds = rounds.map((r) => r.id);
  const { data: matches, error: matchesError } = await supabase.from("matches").select("*").in("round_id", roundIds);
  if (matchesError) throw matchesError;

  const pending = (matches as Match[]).filter((m) => m.outcome === null);
  if (pending.length > 0) throw new Error("Every match in the current round must be recorded first");

  const { data: statsRows, error: statsError } = await supabase
    .from("player_season_stats")
    .select("player_id, byes_received")
    .eq("season_id", seasonId)
    .in("player_id", seatOrder);
  if (statsError) throw statsError;
  const byesByPlayer = Object.fromEntries(statsRows.map((r) => [r.player_id, r.byes_received]));

  const rawMatches: RawMatch[] = (matches as Match[]).map((m) => ({
    player1Id: m.player1_id,
    player2Id: m.player2_id,
    outcome: m.outcome!,
  }));

  const { players, previousOpponents } = computeStandingsState(seatOrder, rawMatches, byesByPlayer);
  const { pairings, byePlayerId } = generateSwissPairings(players, previousOpponents, seatOrder.length);

  const { data: newRound, error: newRoundError } = await supabase
    .from("rounds")
    .insert({ pod_id: podId, round_number: currentRoundNumber + 1 })
    .select("id")
    .single();
  if (newRoundError) throw newRoundError;

  await insertRoundMatches(newRound.id, seasonId, pairings, byePlayerId);

  revalidatePath("/");
  return newRound.id;
}

export async function recordMatchResult({
  matchId,
  outcome,
}: {
  matchId: string;
  outcome: MatchOutcome;
}): Promise<void> {
  const supabase = await createClient();

  const { data: match, error: matchError } = await supabase.from("matches").select("*").eq("id", matchId).single();
  if (matchError) throw matchError;
  if (match.outcome !== null) throw new Error("This match has already been recorded");
  if (!match.player2_id) throw new Error("Byes don't need a result recorded");

  const { data: round, error: roundError } = await supabase
    .from("rounds")
    .select("pod_id")
    .eq("id", match.round_id)
    .single();
  if (roundError) throw roundError;
  const seasonId = await getPodSeasonId(round.pod_id);

  const { data: statsRows, error: statsError } = await supabase
    .from("player_season_stats")
    .select("*")
    .eq("season_id", seasonId)
    .in("player_id", [match.player1_id, match.player2_id]);
  if (statsError) throw statsError;

  const p1Stats = (statsRows as PlayerSeasonStats[]).find((s) => s.player_id === match.player1_id)!;
  const p2Stats = (statsRows as PlayerSeasonStats[]).find((s) => s.player_id === match.player2_id)!;

  const result = applyEloUpdate({
    p1Rating: p1Stats.rating,
    p2Rating: p2Stats.rating,
    p1GamesPlayed: p1Stats.games_played,
    p2GamesPlayed: p2Stats.games_played,
    outcome,
  });

  const { error: updateMatchError } = await supabase
    .from("matches")
    .update({
      outcome,
      p1_rating_before: result.p1RatingBefore,
      p1_rating_after: result.p1RatingAfter,
      p2_rating_before: result.p2RatingBefore,
      p2_rating_after: result.p2RatingAfter,
      recorded_at: new Date().toISOString(),
    })
    .eq("id", matchId);
  if (updateMatchError) throw updateMatchError;

  const p1Won = outcome === "p1_2_0" || outcome === "p1_2_1";
  const p2Won = outcome === "p2_2_0" || outcome === "p2_2_1";
  const isDraw = outcome === "draw";

  await updatePlayerStats(seasonId, match.player1_id, {
    rating: result.p1RatingAfter,
    games_played: p1Stats.games_played + 1,
    wins: p1Stats.wins + (p1Won ? 1 : 0),
    losses: p1Stats.losses + (p2Won ? 1 : 0),
    draws: p1Stats.draws + (isDraw ? 1 : 0),
  });
  await updatePlayerStats(seasonId, match.player2_id, {
    rating: result.p2RatingAfter,
    games_played: p2Stats.games_played + 1,
    wins: p2Stats.wins + (p2Won ? 1 : 0),
    losses: p2Stats.losses + (p1Won ? 1 : 0),
    draws: p2Stats.draws + (isDraw ? 1 : 0),
  });

  revalidatePath("/");
  revalidatePath(`/admin/pods/${round.pod_id}`);
}

async function updatePlayerStats(
  seasonId: string,
  playerId: string,
  fields: { rating: number; games_played: number; wins: number; losses: number; draws: number },
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("player_season_stats")
    .update(fields)
    .eq("season_id", seasonId)
    .eq("player_id", playerId);
  if (error) throw error;
}

export async function createSeason({
  label,
  startDate,
}: {
  label: string;
  startDate: string;
}): Promise<string> {
  const supabase = await createClient();

  const { error: deactivateError } = await supabase
    .from("seasons")
    .update({ is_active: false, end_date: startDate })
    .eq("is_active", true);
  if (deactivateError) throw deactivateError;

  const { data, error } = await supabase
    .from("seasons")
    .insert({ label, start_date: startDate, is_active: true })
    .select("id")
    .single();
  if (error) throw error;

  revalidatePath("/");
  return data.id;
}
