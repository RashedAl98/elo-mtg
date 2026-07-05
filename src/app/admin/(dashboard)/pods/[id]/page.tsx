import { notFound } from "next/navigation";
import { getAllPlayers, getEvent, getPod, getPodMatches, getPodRounds } from "@/lib/queries";
import { PodRunner } from "./pod-runner";

export default async function PodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pod = await getPod(id);
  if (!pod) notFound();

  const [event, rounds, matches, allPlayers] = await Promise.all([
    getEvent(pod.event_id),
    getPodRounds(pod.id),
    getPodMatches(pod.id),
    getAllPlayers(),
  ]);

  const playersById = Object.fromEntries(allPlayers.map((p) => [p.id, p.name]));

  const roundsWithMatches = rounds.map((r) => ({
    ...r,
    matches: matches.filter((m) => m.round_id === r.id),
  }));

  return (
    <div>
      <p className="mb-1 text-sm text-muted">{event?.event_date}</p>
      <h1 className="mb-4 font-display text-xl font-bold tracking-wide text-gold-bright">
        Pod ({pod.seat_order.length} players)
      </h1>
      <PodRunner podId={pod.id} seatOrder={pod.seat_order} playersById={playersById} rounds={roundsWithMatches} />
    </div>
  );
}
