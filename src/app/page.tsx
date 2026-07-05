import Link from "next/link";
import { getActiveSeason, getLeaderboard, getSeasons } from "@/lib/queries";
import { SeasonSelector } from "./season-selector";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season: seasonParam } = await searchParams;
  const [seasons, activeSeason] = await Promise.all([getSeasons(), getActiveSeason()]);

  const selectedSeasonId = seasonParam ?? activeSeason?.id;
  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId);
  const leaderboard = selectedSeasonId ? await getLeaderboard(selectedSeasonId) : [];

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Cube League</h1>
        {seasons.length > 0 && <SeasonSelector seasons={seasons} selectedSeasonId={selectedSeasonId} />}
      </div>

      {selectedSeason && (
        <p className="mb-4 text-sm text-gray-500">
          {selectedSeason.label} · started {selectedSeason.start_date}
          {selectedSeason.end_date ? ` · ended ${selectedSeason.end_date}` : ""}
        </p>
      )}

      {leaderboard.length === 0 ? (
        <p className="text-gray-500">No matches recorded for this season yet.</p>
      ) : (
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b text-sm text-gray-500">
              <th className="py-2 pr-2">#</th>
              <th className="py-2 pr-2">Player</th>
              <th className="py-2 pr-2 text-right">Rating</th>
              <th className="py-2 pr-2 text-right">W-L-D</th>
              <th className="py-2 pr-2 text-right">Games</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((row, i) => (
              <tr key={row.player_id} className="border-b last:border-0">
                <td className="py-2 pr-2 text-gray-500">{i + 1}</td>
                <td className="py-2 pr-2 font-medium">
                  <Link href={`/player/${row.player_id}`} className="hover:underline">
                    {row.player_name}
                  </Link>
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">{Math.round(row.rating)}</td>
                <td className="py-2 pr-2 text-right tabular-nums text-gray-500">
                  {row.wins}-{row.losses}-{row.draws}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums text-gray-500">{row.games_played}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-10 border-t pt-4 text-center">
        <Link href="/admin" className="text-xs text-gray-400 hover:underline">
          Organizer sign in
        </Link>
      </div>
    </div>
  );
}
