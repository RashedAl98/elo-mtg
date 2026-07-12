"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteMatch } from "@/app/admin/actions";
import type { MatchWithPlayers } from "@/lib/types";

export function RecentMatches({ matches }: { matches: MatchWithPlayers[] }) {
  const router = useRouter();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (matches.length === 0) {
    return <p className="text-sm text-muted">No matches recorded yet this season.</p>;
  }

  async function handleDelete(matchId: string) {
    setDeletingId(matchId);
    setError(null);
    try {
      await deleteMatch(matchId);
      setConfirmingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete match");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-loss">{error}</p>}
      <ul className="divide-y divide-edge/60 overflow-hidden rounded-lg border border-edge bg-surface">
        {matches.map((m) => {
          const p1 = m.player1?.name ?? "?";
          const p2 = m.player2?.name ?? "?";
          const summary =
            m.outcome === "draw"
              ? `${p1} draws ${p2}`
              : m.outcome === "p1_win"
                ? `${p1} def. ${p2}`
                : `${p2} def. ${p1}`;
          const isConfirming = confirmingId === m.id;
          const isDeleting = deletingId === m.id;

          return (
            <li key={m.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
              <span className={isConfirming ? "text-muted" : ""}>{summary}</span>
              <span className="flex items-center gap-2">
                {isConfirming ? (
                  <>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleDelete(m.id)}
                      className="rounded bg-loss/15 px-2.5 py-1 text-xs font-semibold text-loss disabled:opacity-50"
                    >
                      {isDeleting ? "Deleting…" : "Delete?"}
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => setConfirmingId(null)}
                      className="rounded border border-edge px-2.5 py-1 text-xs text-muted"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-muted/60">{m.recorded_at.slice(0, 10)}</span>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(m.id)}
                      aria-label={`Delete match: ${summary}`}
                      className="px-1 text-muted/50 hover:text-loss"
                    >
                      ✕
                    </button>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
