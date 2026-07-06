"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { recordMatch, upsertPlayer } from "@/app/admin/actions";
import type { Player } from "@/lib/types";

export function RecordMatchForm({ players }: { players: Player[] }) {
  const router = useRouter();
  const [player1Id, setPlayer1Id] = useState("");
  const [player2Id, setPlayer2Id] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [lastRecorded, setLastRecorded] = useState<string | null>(null);

  const nameById = new Map(players.map((p) => [p.id, p.name]));
  const p1Name = nameById.get(player1Id);
  const p2Name = nameById.get(player2Id);
  const ready = player1Id && player2Id && player1Id !== player2Id;

  async function handleRecord(outcome: "p1_win" | "p2_win" | "draw") {
    if (!ready) return;
    setSubmitting(true);
    setError(null);
    setLastRecorded(null);
    try {
      await recordMatch({ player1Id, player2Id, outcome });
      setLastRecorded(
        outcome === "draw"
          ? `${p1Name} draws ${p2Name}`
          : outcome === "p1_win"
            ? `${p1Name} def. ${p2Name}`
            : `${p2Name} def. ${p1Name}`,
      );
      setPlayer1Id("");
      setPlayer2Id("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't record match");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddNewPlayer() {
    const name = newPlayerName.trim();
    if (!name) return;
    setAddingPlayer(true);
    setError(null);
    try {
      await upsertPlayer(name);
      setNewPlayerName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add player");
    } finally {
      setAddingPlayer(false);
    }
  }

  const selectClass =
    "flex-1 rounded border border-edge bg-raised px-3 py-3 text-base text-ink [color-scheme:dark]";

  return (
    <div className="rounded-lg border border-edge bg-surface p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Record a match</h2>

      <div className="mb-3 flex items-center gap-2">
        <select value={player1Id} onChange={(e) => setPlayer1Id(e.target.value)} className={selectClass}>
          <option value="">Player 1…</option>
          {players
            .filter((p) => p.id !== player2Id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
        <span className="text-sm text-muted">vs</span>
        <select value={player2Id} onChange={(e) => setPlayer2Id(e.target.value)} className={selectClass}>
          <option value="">Player 2…</option>
          {players
            .filter((p) => p.id !== player1Id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={!ready || submitting}
          onClick={() => handleRecord("p1_win")}
          className="rounded border border-edge bg-raised px-4 py-3 text-base font-medium hover:border-gold/50 hover:text-gold-bright active:bg-edge disabled:opacity-40"
        >
          {p1Name ?? "Player 1"} wins
        </button>
        <button
          type="button"
          disabled={!ready || submitting}
          onClick={() => handleRecord("draw")}
          className="rounded border border-edge bg-raised px-4 py-3 text-base font-medium hover:border-gold/50 hover:text-gold-bright active:bg-edge disabled:opacity-40"
        >
          Draw
        </button>
        <button
          type="button"
          disabled={!ready || submitting}
          onClick={() => handleRecord("p2_win")}
          className="rounded border border-edge bg-raised px-4 py-3 text-base font-medium hover:border-gold/50 hover:text-gold-bright active:bg-edge disabled:opacity-40"
        >
          {p2Name ?? "Player 2"} wins
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-loss">{error}</p>}
      {lastRecorded && !error && (
        <p className="mt-3 text-sm text-win">Recorded: {lastRecorded}</p>
      )}

      <div className="mt-4 flex gap-2 border-t border-edge pt-4">
        <input
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          placeholder="New player name"
          className="flex-1 rounded border border-edge bg-raised px-3 py-2 text-sm text-ink placeholder:text-muted/60"
        />
        <button
          type="button"
          onClick={handleAddNewPlayer}
          disabled={addingPlayer || !newPlayerName.trim()}
          className="rounded border border-edge bg-raised px-3 py-2 text-sm hover:border-gold/50 disabled:opacity-50"
        >
          Add player
        </button>
      </div>
    </div>
  );
}
