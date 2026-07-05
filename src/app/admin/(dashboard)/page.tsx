import Link from "next/link";
import { getActiveSeason, getRecentEvents } from "@/lib/queries";

export default async function AdminHome() {
  const activeSeason = await getActiveSeason();

  return (
    <div>
      {!activeSeason ? (
        <div className="rounded-lg border border-dashed border-edge bg-surface p-5">
          <p className="mb-3 text-sm text-muted">No active season yet.</p>
          <Link
            href="/admin/seasons/new"
            className="inline-block rounded bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright"
          >
            Start a season
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">Active season</p>
              <p className="text-lg font-semibold">{activeSeason.label}</p>
            </div>
            <Link
              href="/admin/events/new"
              className="rounded bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright"
            >
              + New event
            </Link>
          </div>

          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Recent events</h2>
          <RecentEvents seasonId={activeSeason.id} />

          <div className="mt-8 border-t border-edge pt-4">
            <Link href="/admin/seasons/new" className="text-sm text-muted/70 hover:text-muted hover:underline">
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
    return <p className="text-sm text-muted">No events yet this season.</p>;
  }

  return (
    <ul className="divide-y divide-edge/60 overflow-hidden rounded-lg border border-edge bg-surface">
      {events.map((event) => {
        const pods = (event as unknown as { pods: { id: string }[] }).pods;
        return (
          <li key={event.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span>{event.event_date}</span>
            {pods[0] ? (
              <Link href={`/admin/pods/${pods[0].id}`} className="font-medium text-gold hover:text-gold-bright hover:underline">
                Run pod →
              </Link>
            ) : (
              <span className="text-muted/60">no pod</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
