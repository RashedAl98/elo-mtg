import Link from "next/link";
import { getActiveSeason, getLeaderboard, getRecentDeltas, getSeasons } from "@/lib/queries";
import { SeasonSelector } from "./season-selector";

const MEDALS = [
  { ring: "border-gold text-gold-bright", label: "bg-gold/15" },
  { ring: "border-zinc-400 text-zinc-300", label: "bg-zinc-400/10" },
  { ring: "border-amber-700 text-amber-500", label: "bg-amber-700/10" },
];

function DeltaBadge({ delta }: { delta: number | undefined }) {
  if (delta === undefined || delta === 0) {
    return <span className="text-xs text-muted/60">—</span>;
  }
  const up = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
        up ? "bg-win/10 text-win" : "bg-loss/10 text-loss"
      }`}
    >
      {up ? "▲" : "▼"} {up ? "+" : ""}
      {delta}
    </span>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season: seasonParam } = await searchParams;
  const [seasons, activeSeason] = await Promise.all([getSeasons(), getActiveSeason()]);

  const selectedSeasonId = seasonParam ?? activeSeason?.id;
  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId);
  const [leaderboard, deltas] = selectedSeasonId
    ? await Promise.all([getLeaderboard(selectedSeasonId), getRecentDeltas(selectedSeasonId)])
    : [[], {} as Record<string, number>];

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h1 className="font-display text-3xl font-bold tracking-wide text-gold-bright">
          Cube League
        </h1>
        {seasons.length > 0 && <SeasonSelector seasons={seasons} selectedSeasonId={selectedSeasonId} />}
      </div>

      {selectedSeason && (
        <p className="mb-6 text-sm text-muted">
          {selectedSeason.label} · started {selectedSeason.start_date}
          {selectedSeason.end_date ? ` · ended ${selectedSeason.end_date}` : ""}
        </p>
      )}

      {leaderboard.length === 0 ? (
        <div className="rounded-lg border border-edge bg-surface p-8 text-center text-muted">
          No matches recorded for this season yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-edge bg-surface">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-edge text-xs uppercase tracking-wider text-muted">
                <th className="py-3 pl-4 pr-2">#</th>
                <th className="py-3 pr-2">Player</th>
                <th className="py-3 pr-2 text-right">Rating</th>
                <th className="py-3 pr-2 text-right">Last played</th>
                <th className="py-3 pr-2 text-right">W-L-D</th>
                <th className="py-3 pr-4 text-right">Games</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, i) => {
                const medal = i < 3 && row.games_played > 0 ? MEDALS[i] : null;
                return (
                  <tr
                    key={row.player_id}
                    className={`border-b border-edge/60 last:border-0 ${medal ? medal.label : ""}`}
                  >
                    <td className="py-3 pl-4 pr-2">
                      {medal ? (
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full border font-display text-sm font-bold ${medal.ring}`}
                        >
                          {i + 1}
                        </span>
                      ) : (
                        <span className="inline-flex h-7 w-7 items-center justify-center text-sm text-muted">
                          {i + 1}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-2 font-medium">
                      <Link href={`/player/${row.player_id}`} className="hover:text-gold-bright hover:underline">
                        {row.player_name}
                      </Link>
                    </td>
                    <td className="py-3 pr-2 text-right font-semibold tabular-nums text-gold-bright">
                      {Math.round(row.rating)}
                    </td>
                    <td className="py-3 pr-2 text-right">
                      <DeltaBadge delta={deltas[row.player_id]} />
                    </td>
                    <td className="py-3 pr-2 text-right tabular-nums text-muted">
                      {row.wins}-{row.losses}-{row.draws}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-muted">{row.games_played}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-10 border-t border-edge pt-4 text-center">
        <Link href="/admin" className="text-xs text-muted/70 hover:text-muted hover:underline">
          Organizer sign in
        </Link>
      </div>
    </div>
  );
}
