"use client";

import { useRouter } from "next/navigation";
import type { Season } from "@/lib/types";

export function SeasonSelector({ seasons, selectedSeasonId }: { seasons: Season[]; selectedSeasonId?: string }) {
  const router = useRouter();

  return (
    <select
      defaultValue={selectedSeasonId}
      onChange={(e) => router.push(`/?season=${e.target.value}`)}
      className="rounded border px-2 py-1 text-sm"
    >
      {seasons.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
          {s.is_active ? " (current)" : ""}
        </option>
      ))}
    </select>
  );
}
