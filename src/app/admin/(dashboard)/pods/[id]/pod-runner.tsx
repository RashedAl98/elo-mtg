"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateNextRound, recordMatchResult } from "@/app/admin/actions";
import { computeStandingsState, type RawMatch } from "@/lib/pairing";
import type { MatchOutcome } from "@/lib/elo";
import type { Match } from "@/lib/types";

interface RoundWithMatches {
  id: string;
  round_number: number;
  matches: Match[];
}

const OUTCOME_BUTTONS: Array<{ outcome: MatchOutcome; label: (p1: string, p2: string) => string }> = [
  { outcome: "p1_win", label: (p1) => `${p1} wins` },
  { outcome: "draw", label: () => "Draw" },
  { outcome: "p2_win", label: (_p1, p2) => `${p2} wins` },
];

function outcomeSummary(m: Match, playersById: Record<string, string>): string {
  const p1 = playersById[m.player1_id] ?? "?";
  if (m.outcome === "bye") return `${p1} — bye`;
  const p2 = m.player2_id ? playersById[m.player2_id] ?? "?" : "?";
  switch (m.outcome) {
    case "p1_win":
      return `${p1} def. ${p2}`;
    case "p2_win":
      return `${p2} def. ${p1}`;
    case "draw":
      return `${p1} draws ${p2}`;
    default:
      return `${p1} vs ${p2}`;
  }
}

export function PodRunner({
  podId,
  seatOrder,
  playersById,
  rounds,
}: {
  podId: string;
  seatOrder: string[];
  playersById: Record<string, string>;
  rounds: RoundWithMatches[];
}) {
  const router = useRouter();
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentRound = rounds[rounds.length - 1];
  const roundComplete = currentRound?.matches.every((m) => m.outcome !== null) ?? false;

  async function handleRecord(matchId: string, outcome: MatchOutcome) {
    setSubmitting(true);
    setError(null);
    try {
      await recordMatchResult({ matchId, outcome });
      setExpandedMatchId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't record result");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGenerateNext() {
    setGenerating(true);
    setError(null);
    try {
      await generateNextRound(podId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate next round");
    } finally {
      setGenerating(false);
    }
  }

  const allMatches = rounds.flatMap((r) => r.matches);
  const podFinished = rounds.length === 3 && roundComplete;

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="text-sm text-loss">{error}</p>}

      {rounds.map((round) => (
        <div key={round.id}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Round {round.round_number}
          </h2>
          <ul className="flex flex-col gap-2">
            {round.matches.map((m) => {
              const isPending = m.outcome === null;
              const isExpanded = expandedMatchId === m.id;
              const p1 = playersById[m.player1_id] ?? "?";
              const p2 = m.player2_id ? playersById[m.player2_id] ?? "?" : "?";

              if (!isPending) {
                return (
                  <li key={m.id} className="rounded border border-edge bg-surface px-3 py-2 text-sm text-muted">
                    {outcomeSummary(m, playersById)}
                  </li>
                );
              }

              return (
                <li key={m.id} className={`rounded border bg-surface ${isExpanded ? "border-gold/60" : "border-edge"}`}>
                  <button
                    type="button"
                    onClick={() => setExpandedMatchId(isExpanded ? null : m.id)}
                    className="flex w-full items-center justify-between px-3 py-3 text-left text-base font-medium"
                  >
                    <span>
                      {p1} <span className="text-muted">vs</span> {p2}
                    </span>
                    <span className="text-muted">{isExpanded ? "▲" : "▼"}</span>
                  </button>
                  {isExpanded && (
                    <div className="flex flex-col gap-2 border-t border-edge p-3">
                      {OUTCOME_BUTTONS.map(({ outcome, label }) => (
                        <button
                          key={outcome}
                          type="button"
                          disabled={submitting}
                          onClick={() => handleRecord(m.id, outcome)}
                          className="rounded border border-edge bg-raised px-4 py-3 text-base font-medium hover:border-gold/50 hover:text-gold-bright active:bg-edge disabled:opacity-50"
                        >
                          {label(p1, p2)}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {roundComplete && rounds.length < 3 && (
        <button
          type="button"
          onClick={handleGenerateNext}
          disabled={generating}
          className="rounded bg-gold px-4 py-3 font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
        >
          {generating ? "Generating…" : `Generate round ${rounds.length + 1}`}
        </button>
      )}

      {podFinished && <FinalStandings seatOrder={seatOrder} matches={allMatches} playersById={playersById} />}
    </div>
  );
}

function FinalStandings({
  seatOrder,
  matches,
  playersById,
}: {
  seatOrder: string[];
  matches: Match[];
  playersById: Record<string, string>;
}) {
  const rawMatches: RawMatch[] = matches.map((m) => ({
    player1Id: m.player1_id,
    player2Id: m.player2_id,
    outcome: m.outcome!,
  }));
  const { players } = computeStandingsState(seatOrder, rawMatches, {});
  const standings = [...players].sort((a, b) => b.matchPoints - a.matchPoints);

  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Final standings</h2>
      <ol className="flex flex-col gap-1">
        {standings.map((p, i) => (
          <li
            key={p.id}
            className={`flex justify-between rounded border px-3 py-2 text-sm ${
              i === 0 ? "border-gold/60 bg-gold/10 font-semibold text-gold-bright" : "border-edge bg-surface"
            }`}
          >
            <span>
              {i + 1}. {playersById[p.id] ?? "?"}
            </span>
            <span className={`tabular-nums ${i === 0 ? "" : "text-muted"}`}>{p.matchPoints} pts</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
