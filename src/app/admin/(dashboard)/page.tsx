import Link from "next/link";
import { getActiveSeason, getAllPlayers, getRecentMatches } from "@/lib/queries";
import { RecordMatchForm } from "./record-match-form";
import { RecentMatches } from "./recent-matches";

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
