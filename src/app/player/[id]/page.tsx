import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayer, getPlayerMatchHistory, getPlayerSeasonHistory } from "@/lib/queries";

function outcomeLabel(outcome: string, isPlayer1: boolean): string {
  if (outcome === "draw") return "Draw";
  const won = (outcome === "p1_win") === isPlayer1;
  return won ? "Won" : "Lost";
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getPlayer(id);
  if (!player) notFound();

  const [seasonHistory, matchHistory] = await Promise.all([
    getPlayerSeasonHistory(id),
    getPlayerMatchHistory(id),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <Link href="/" className="text-sm text-gray-400 hover:underline">
        ← Leaderboard
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">{player.name}</h1>

      <h2 className="mb-2 text-lg font-semibold">Seasons</h2>
      <table className="mb-8 w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b text-gray-500">
            <th className="py-2 pr-2">Season</th>
            <th className="py-2 pr-2 text-right">Rating</th>
            <th className="py-2 pr-2 text-right">W-L-D</th>
            <th className="py-2 pr-2 text-right">Games</th>
          </tr>
        </thead>
        <tbody>
          {seasonHistory.map((row) => {
            const season = (row as unknown as { seasons: { label: string; is_active: boolean } }).seasons;
            return (
              <tr key={row.season_id} className="border-b last:border-0">
                <td className="py-2 pr-2">
                  {season.label}
                  {season.is_active ? " (current)" : ""}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">{Math.round(row.rating)}</td>
                <td className="py-2 pr-2 text-right tabular-nums text-gray-500">
                  {row.wins}-{row.losses}-{row.draws}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums text-gray-500">{row.games_played}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2 className="mb-2 text-lg font-semibold">Match history</h2>
      {matchHistory.length === 0 ? (
        <p className="text-sm text-gray-500">No recorded matches yet.</p>
      ) : (
        <ul className="divide-y">
          {matchHistory.map((m) => {
            const isPlayer1 = m.player1_id === id;
            const opponent = isPlayer1 ? m.player2 : m.player1;
            const delta = isPlayer1 ? m.p1_rating_after! - m.p1_rating_before! : m.p2_rating_after! - m.p2_rating_before!;
            return (
              <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="font-medium">{outcomeLabel(m.outcome!, isPlayer1)}</span>{" "}
                  <span className="text-gray-500">
                    vs{" "}
                    {opponent ? (
                      <Link href={`/player/${opponent.id}`} className="hover:underline">
                        {opponent.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </span>
                  {m.event_date && <span className="ml-2 text-gray-400">· {m.event_date}</span>}
                </div>
                <span className={delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-gray-400"}>
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
