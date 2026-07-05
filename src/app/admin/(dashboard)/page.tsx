import Link from "next/link";
import { getActiveSeason, getRecentEvents } from "@/lib/queries";

export default async function AdminHome() {
  const activeSeason = await getActiveSeason();

  return (
    <div>
      {!activeSeason ? (
        <div className="rounded border border-dashed p-4">
          <p className="mb-3 text-sm text-gray-600">No active season yet.</p>
          <Link href="/admin/seasons/new" className="rounded bg-black px-4 py-2 text-sm text-white">
            Start a season
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active season</p>
              <p className="text-lg font-semibold">{activeSeason.label}</p>
            </div>
            <Link href="/admin/events/new" className="rounded bg-black px-4 py-2 text-sm font-medium text-white">
              + New event
            </Link>
          </div>

          <h2 className="mb-2 text-sm font-semibold text-gray-500">Recent events</h2>
          <RecentEvents seasonId={activeSeason.id} />

          <div className="mt-8 border-t pt-4">
            <Link href="/admin/seasons/new" className="text-sm text-gray-400 hover:underline">
              Start a new season
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

async function RecentEvents({ seasonId }: { seasonId: string }) {
  const events = await getRecentEvents(seasonId);

  if (events.length === 0) {
    return <p className="text-sm text-gray-500">No events yet this season.</p>;
  }

  return (
    <ul className="divide-y">
      {events.map((event) => {
        const pods = (event as unknown as { pods: { id: string }[] }).pods;
        return (
          <li key={event.id} className="flex items-center justify-between py-2 text-sm">
            <span>{event.event_date}</span>
            {pods[0] ? (
              <Link href={`/admin/pods/${pods[0].id}`} className="text-blue-600 hover:underline">
                Run pod →
              </Link>
            ) : (
              <span className="text-gray-400">no pod</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
