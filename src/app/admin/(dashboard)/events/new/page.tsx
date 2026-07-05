import { redirect } from "next/navigation";
import { getActiveSeason, getAllPlayers } from "@/lib/queries";
import { NewEventForm } from "./new-event-form";

export default async function NewEventPage() {
  const activeSeason = await getActiveSeason();
  if (!activeSeason) redirect("/admin/seasons/new");

  const players = await getAllPlayers();

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-bold tracking-wide text-gold-bright">New event</h1>
      <p className="mb-4 text-sm text-muted">{activeSeason.label}</p>
      <NewEventForm seasonId={activeSeason.id} allPlayers={players} />
    </div>
  );
}
