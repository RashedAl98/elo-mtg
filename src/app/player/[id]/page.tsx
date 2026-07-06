import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveSeason, getPlayer, getPlayerMatchHistory, getPlayerSeasonHistory } from "@/lib/queries";
import { RatingChart } from "./rating-chart";

function outcomeLabel(outcome: string, isPlayer1: boolean): string {
  if (outcome === "draw") return "Draw";
  const won = (outcome === "p1_win") === isPlayer1;
  return won ? "Won" : "Lost";
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getPlayer(id);
  if (!player) notFound();

  const [seasonHistory, matchHistory, activeSeason] = await Promise.all([
    getPlayerSeasonHistory(id),
    getPlayerMatchHistory(id),
    getActiveSeason(),
  ]);

  // Chronological rating curve for the current season: start rating, then rating after each match.
  const chartRatings: number[] = [];
  if (activeSeason) {
    const seasonMatches = matchHistory.filter((m) => m.season_id === activeSeason.id).reverse();
    if (seasonMatches.length > 0) {
      const first = seasonMatches[0];
      const firstIsP1 = first.player1_id === id;
      chartRatings.push(Number(firstIsP1 ? first.p1_rating_before : first.p2_rating_before) || 1500);
      for (const m of seasonMatches) {
        const isP1 = m.player1_id === id;
        chartRatings.push(Number(isP1 ? m.p1_rating_after : m.p2_rating_after));
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <Link href="/" className="text-sm text-muted hover:text-gold-bright hover:underline">
        ← Leaderboard
      </Link>
      <h1 className="mb-6 mt-2 font-display text-3xl font-bold tracking-wide text-gold-bright">{player.name}</h1>

      {chartRatings.length >= 2 && (
        <div className="mb-8 rounded-lg border border-edge bg-surface p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Rating this season
          </h2>
          <RatingChart ratings={chartRatings} />
        </div>
      )}

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Seasons</h2>
      <div className="mb-8 overflow-hidden rounded-lg border border-edge bg-surface">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-edge text-xs uppercase tracking-wider text-muted">
              <th className="py-2.5 pl-4 pr-2">Season</th>
              <th className="py-2.5 pr-2 text-right">Rating</th>
              <th className="py-2.5 pr-2 text-right">W-L-D</th>
              <th className="py-2.5 pr-4 text-right">Games</th>
            </tr>
          </thead>
          <tbody>
            {seasonHistory.map((row) => {
              const season = (row as unknown as { seasons: { label: string; is_active: boolean } }).seasons;
              return (
                <tr key={row.season_id} className="border-b border-edge/60 last:border-0">
                  <td className="py-2.5 pl-4 pr-2">
                    {season.label}
                    {season.is_active && <span className="ml-1.5 text-xs text-gold">• current</span>}
                  </td>
                  <td className="py-2.5 pr-2 text-right font-semibold tabular-nums text-gold-bright">
                    {Math.round(row.rating)}
                  </td>
                  <td className="py-2.5 pr-2 text-right tabular-nums text-muted">
                    {row.wins}-{row.losses}-{row.draws}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-muted">{row.games_played}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Match history</h2>
      {matchHistory.length === 0 ? (
        <div className="rounded-lg border border-edge bg-surface p-6 text-center text-sm text-muted">
          No recorded matches yet.
        </div>
      ) : (
        <ul className="divide-y divide-edge/60 overflow-hidden rounded-lg border border-edge bg-surface">
          {matchHistory.map((m) => {
            const isPlayer1 = m.player1_id === id;
            const opponent = isPlayer1 ? m.player2 : m.player1;
            const delta = isPlayer1
              ? Number(m.p1_rating_after) - Number(m.p1_rating_before)
              : Number(m.p2_rating_after) - Number(m.p2_rating_before);
            return (
              <li key={m.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div>
                  <span className="font-medium">{outcomeLabel(m.outcome, isPlayer1)}</span>{" "}
                  <span className="text-muted">
                    vs{" "}
                    {opponent ? (
                      <Link href={`/player/${opponent.id}`} className="hover:text-gold-bright hover:underline">
                        {opponent.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </span>
                  <span className="ml-2 text-muted/60">· {m.recorded_at.slice(0, 10)}</span>
                </div>
                <span
                  className={`font-semibold tabular-nums ${
                    delta > 0 ? "text-win" : delta < 0 ? "text-loss" : "text-muted/60"
                  }`}
                >
                  {delta > 0 ? "+" : ""}
                  {delta}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
