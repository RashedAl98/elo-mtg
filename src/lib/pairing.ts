export interface PairingPlayer {
  id: string;
  seatIndex: number;
  matchPoints: number;
  byesReceivedThisSeason: number;
}

export interface PairingResult {
  pairings: Array<{ player1Id: string; player2Id: string }>;
  byePlayerId: string | null;
}

/**
 * Round 1: pair seat i with seat (i + n/2) mod n — the opposite side of the
 * table. For any n >= 4 the circular distance between paired seats is >= 2,
 * so paired players are never seat-adjacent.
 */
export function generateRound1Pairings(seatOrder: string[]): PairingResult {
  const n = seatOrder.length;
  if (n < 4) {
    throw new Error("Need at least 4 players to seat-avoid pair a pod");
  }
  const half = Math.floor(n / 2);
  const pairings: Array<{ player1Id: string; player2Id: string }> = [];
  for (let i = 0; i < half; i++) {
    pairings.push({ player1Id: seatOrder[i], player2Id: seatOrder[(i + half) % n] });
  }
  const byePlayerId = n % 2 === 1 ? seatOrder[n - 1] : null;
  return { pairings, byePlayerId };
}

function circularSeatDistance(a: number, b: number, seatCount: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, seatCount - d);
}

/**
 * Rounds 2-3: pick a bye (fewest byes this season, then lowest match points),
 * then pair the rest via backtracking — hard constraint is no repeat
 * opponents this event, soft preference is closest match points and
 * non-adjacent seats.
 */
export function generateSwissPairings(
  players: PairingPlayer[],
  previousOpponents: Map<string, Set<string>>,
  seatCount: number,
): PairingResult {
  let pool = [...players];
  let byePlayerId: string | null = null;

  if (pool.length % 2 === 1) {
    const byeCandidate = [...pool].sort((a, b) => {
      if (a.byesReceivedThisSeason !== b.byesReceivedThisSeason) {
        return a.byesReceivedThisSeason - b.byesReceivedThisSeason;
      }
      if (a.matchPoints !== b.matchPoints) return a.matchPoints - b.matchPoints;
      return a.seatIndex - b.seatIndex;
    })[0];
    byePlayerId = byeCandidate.id;
    pool = pool.filter((p) => p.id !== byeCandidate.id);
  }

  const ordered = [...pool].sort((a, b) => {
    if (a.matchPoints !== b.matchPoints) return b.matchPoints - a.matchPoints;
    return a.seatIndex - b.seatIndex;
  });

  const pairings = backtrackPair(ordered, previousOpponents, seatCount);
  if (!pairings) {
    throw new Error("No valid Swiss pairing found — every remaining combination has already played this event");
  }
  return { pairings, byePlayerId };
}

function backtrackPair(
  remaining: PairingPlayer[],
  previousOpponents: Map<string, Set<string>>,
  seatCount: number,
): Array<{ player1Id: string; player2Id: string }> | null {
  if (remaining.length === 0) return [];

  const [first, ...rest] = remaining;

  const candidates = [...rest].sort((a, b) => {
    const diffA = Math.abs(a.matchPoints - first.matchPoints);
    const diffB = Math.abs(b.matchPoints - first.matchPoints);
    if (diffA !== diffB) return diffA - diffB;
    const adjA = circularSeatDistance(first.seatIndex, a.seatIndex, seatCount) === 1 ? 1 : 0;
    const adjB = circularSeatDistance(first.seatIndex, b.seatIndex, seatCount) === 1 ? 1 : 0;
    if (adjA !== adjB) return adjA - adjB;
    return a.seatIndex - b.seatIndex;
  });

  for (const candidate of candidates) {
    if (previousOpponents.get(first.id)?.has(candidate.id)) continue;
    const remainingAfter = rest.filter((p) => p.id !== candidate.id);
    const subResult = backtrackPair(remainingAfter, previousOpponents, seatCount);
    if (subResult) {
      return [{ player1Id: first.id, player2Id: candidate.id }, ...subResult];
    }
  }
  return null;
}

export interface RawMatch {
  player1Id: string;
  player2Id: string | null;
  outcome: "p1_win" | "p2_win" | "draw" | "bye";
}

/** Folds an event's matches-so-far into the state generateSwissPairings needs for the next round. */
export function computeStandingsState(
  seatOrder: string[],
  matchesSoFar: RawMatch[],
  byesReceivedThisSeasonByPlayer: Record<string, number>,
): { players: PairingPlayer[]; previousOpponents: Map<string, Set<string>> } {
  const matchPoints: Record<string, number> = {};
  const opponents = new Map<string, Set<string>>();
  for (const seat of seatOrder) {
    matchPoints[seat] = 0;
    opponents.set(seat, new Set());
  }

  for (const m of matchesSoFar) {
    if (m.outcome === "bye" || m.player2Id === null) {
      matchPoints[m.player1Id] += 3;
      continue;
    }
    opponents.get(m.player1Id)?.add(m.player2Id);
    opponents.get(m.player2Id)?.add(m.player1Id);
    if (m.outcome === "draw") {
      matchPoints[m.player1Id] += 1;
      matchPoints[m.player2Id] += 1;
    } else if (m.outcome === "p1_win") {
      matchPoints[m.player1Id] += 3;
    } else {
      matchPoints[m.player2Id] += 3;
    }
  }

  const players: PairingPlayer[] = seatOrder.map((id, seatIndex) => ({
    id,
    seatIndex,
    matchPoints: matchPoints[id],
    byesReceivedThisSeason: byesReceivedThisSeasonByPlayer[id] ?? 0,
  }));

  return { players, previousOpponents: opponents };
}
