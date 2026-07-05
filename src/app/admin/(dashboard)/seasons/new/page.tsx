"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSeason } from "@/app/admin/actions";

function defaultLabel(): string {
  const now = new Date();
  return `${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()} Season`;
}

export default function NewSeasonPage() {
  const router = useRouter();
  const [label, setLabel] = useState(defaultLabel());
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createSeason({ label, startDate });
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Start a new season</h1>
      <p className="mb-4 text-sm text-gray-500">
        This deactivates the current season (if any) and starts every player fresh at 1500.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Label
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Start date
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="rounded border px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-4 py-3 font-medium text-white disabled:opacity-50"
        >
          {loading ? "Starting…" : "Start season"}
        </button>
      </form>
    </div>
  );
}
