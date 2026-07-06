"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { applyEloUpdate, BASE_RATING, type MatchOutcome } from "@/lib/elo";
import type { PlayerSeasonStats } from "@/lib/types";

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

export async function recordMatch({
  player1Id,
  player2Id,
  outcome,
}: {
  player1Id: string;
  player2Id: string;
  outcome: MatchOutcome;
}): Promise<void> {
  if (player1Id === player2Id) throw new Error("A player can't play themselves");

  const supabase = await createClient();

  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();
  if (seasonError) throw seasonError;
  if (!season) throw new Error("No active season — start one first");

  await ensureSeasonStats(season.id, [player1Id, player2Id]);

  const { data: statsRows, error: statsError } = await supabase
    .from("player_season_stats")
    .select("*")
    .eq("season_id", season.id)
    .in("player_id", [player1Id, player2Id]);
  if (statsError) throw statsError;

  const p1Stats = (statsRows as PlayerSeasonStats[]).find((s) => s.player_id === player1Id)!;
  const p2Stats = (statsRows as PlayerSeasonStats[]).find((s) => s.player_id === player2Id)!;

  const result = applyEloUpdate({
    p1Rating: p1Stats.rating,
    p2Rating: p2Stats.rating,
    p1GamesPlayed: p1Stats.games_played,
    p2GamesPlayed: p2Stats.games_played,
    outcome,
  });

  const { error: insertError } = await supabase.from("matches").insert({
    season_id: season.id,
    player1_id: player1Id,
    player2_id: player2Id,
    outcome,
    p1_rating_before: result.p1RatingBefore,
    p1_rating_after: result.p1RatingAfter,
    p2_rating_before: result.p2RatingBefore,
    p2_rating_after: result.p2RatingAfter,
  });
  if (insertError) throw insertError;

  const p1Won = outcome === "p1_win";
  const p2Won = outcome === "p2_win";
  const isDraw = outcome === "draw";

  await updatePlayerStats(season.id, player1Id, {
    rating: result.p1RatingAfter,
    games_played: p1Stats.games_played + 1,
    wins: p1Stats.wins + (p1Won ? 1 : 0),
    losses: p1Stats.losses + (p2Won ? 1 : 0),
    draws: p1Stats.draws + (isDraw ? 1 : 0),
  });
  await updatePlayerStats(season.id, player2Id, {
    rating: result.p2RatingAfter,
    games_played: p2Stats.games_played + 1,
    wins: p2Stats.wins + (p2Won ? 1 : 0),
    losses: p2Stats.losses + (p1Won ? 1 : 0),
    draws: p2Stats.draws + (isDraw ? 1 : 0),
  });

  revalidatePath("/");
  revalidatePath("/admin");
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
