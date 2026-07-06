import Link from "next/link";
import { getActiveSeason, getAllPlayers, getRecentMatches } from "@/lib/queries";
import type { MatchWithPlayers } from "@/lib/types";
import { RecordMatchForm } from "./record-match-form";

export default async function AdminHome() {
  const activeSeason = await getActiveSeason();

  if (!activeSeason) {
    return (
      <div className="rounded-lg border border-dashed border-edge bg-surface p-5">
        <p className="mb-3 text-sm text-muted">No active season yet.</p>
        <Link
          href="/admin/seasons/new"
          className="inline-block rounded bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright"
        >
          Start a season
        </Link>
      </div>
    );
  }

  const [players, recentMatches] = await Promise.all([
    getAllPlayers(),
    getRecentMatches(activeSeason.id),
  ]);

  return (
    <div>
      <p className="mb-4 text-xs uppercase tracking-wider text-muted">
        {activeSeason.label}
      </p>

      <RecordMatchForm players={players} />

      <h2 className="mb-2 mt-8 text-xs font-semibold uppercase tracking-wider text-muted">
        Recent matches
      </h2>
      <RecentMatches matches={recentMatches} />

      <div className="mt-8 border-t border-edge pt-4">
        <Link href="/admin/seasons/new" className="text-sm text-muted/70 hover:text-muted hover:underline">
          Start a new season
        </Link>
      </div>
    </div>
  );
}

function RecentMatches({ matches }: { matches: MatchWithPlayers[] }) {
  if (matches.length === 0) {
    return <p className="text-sm text-muted">No matches recorded yet this season.</p>;
  }

  return (
    <ul className="divide-y divide-edge/60 overflow-hidden rounded-lg border border-edge bg-surface">
      {matches.map((m) => {
        const p1 = m.player1?.name ?? "?";
        const p2 = m.player2?.name ?? "?";
        const summary =
          m.outcome === "draw" ? `${p1} draws ${p2}` : m.outcome === "p1_win" ? `${p1} def. ${p2}` : `${p2} def. ${p1}`;
        return (
          <li key={m.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span>{summary}</span>
            <span className="text-muted/60">{m.recorded_at.slice(0, 10)}</span>
          </li>
        );
      })}
    </ul>
  );
}
