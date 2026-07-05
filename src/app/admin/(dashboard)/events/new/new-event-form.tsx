"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEventAndPod, upsertPlayer } from "@/app/admin/actions";
import type { Player } from "@/lib/types";

export function NewEventForm({ seasonId, allPlayers }: { seasonId: string; allPlayers: Player[] }) {
  const router = useRouter();
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [seatOrder, setSeatOrder] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [addingPlayer, setAddingPlayer] = useState(false);

  const availablePlayers = allPlayers.filter((p) => !seatOrder.some((s) => s.id === p.id));

  function addToSeat(player: Player) {
    setSeatOrder((prev) => [...prev, player]);
  }

  function removeFromSeat(index: number) {
    setSeatOrder((prev) => prev.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    setSeatOrder((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleAddNewPlayer() {
    const name = newPlayerName.trim();
    if (!name) return;
    setAddingPlayer(true);
    setError(null);
    try {
      const id = await upsertPlayer(name);
      addToSeat({ id, name, created_at: new Date().toISOString() });
      setNewPlayerName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add player");
    } finally {
      setAddingPlayer(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (seatOrder.length < 4) {
      setError("Need at least 4 players to seat-avoid pair round 1");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const podId = await createEventAndPod({
        seasonId,
        eventDate,
        seatOrder: seatOrder.map((p) => p.id),
      });
      router.push(`/admin/pods/${podId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <label className="flex flex-col gap-1 text-sm">
        Event date
        <input
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          required
          className="rounded border px-3 py-2"
        />
      </label>

      <div>
        <p className="mb-2 text-sm font-semibold">
          Seating order ({seatOrder.length}){" "}
          <span className="font-normal text-gray-400">— tap around the table in seat order</span>
        </p>
        {seatOrder.length === 0 ? (
          <p className="text-sm text-gray-400">No players seated yet.</p>
        ) : (
          <ol className="flex flex-col gap-1">
            {seatOrder.map((p, i) => (
              <li key={p.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                <span>
                  {i + 1}. {p.name}
                </span>
                <span className="flex gap-2">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="disabled:opacity-30">
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === seatOrder.length - 1}
                    className="disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button type="button" onClick={() => removeFromSeat(i)} className="text-red-500">
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Add a player</p>
        <div className="mb-2 flex gap-2">
          <input
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            placeholder="New player name"
            className="flex-1 rounded border px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleAddNewPlayer}
            disabled={addingPlayer || !newPlayerName.trim()}
            className="rounded border px-3 py-2 text-sm disabled:opacity-50"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {availablePlayers.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => addToSeat(p)}
              className="rounded-full border px-3 py-1 text-sm hover:bg-gray-100"
            >
              + {p.name}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded bg-black px-4 py-3 font-medium text-white disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create pod & generate round 1"}
      </button>
    </form>
  );
}
