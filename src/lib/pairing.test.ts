import { describe, expect, it } from "vitest";
import {
  computeStandingsState,
  generateRound1Pairings,
  generateSwissPairings,
  type PairingPlayer,
} from "./pairing";

function seats(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `p${i}`);
}

function circularDistance(a: number, b: number, n: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, n - d);
}

describe("generateRound1Pairings", () => {
  it.each([6, 7, 8, 9, 10])("never pairs seat-adjacent players for n=%i", (n) => {
    const seatOrder = seats(n);
    const { pairings, byePlayerId } = generateRound1Pairings(seatOrder);

    const seatIndex = new Map(seatOrder.map((id, i) => [id, i]));
    for (const { player1Id, player2Id } of pairings) {
      const dist = circularDistance(seatIndex.get(player1Id)!, seatIndex.get(player2Id)!, n);
      expect(dist).toBeGreaterThan(1);
    }

    // Every player is accounted for exactly once (paired or byed).
    const seen = new Set<string>();
    for (const { player1Id, player2Id } of pairings) {
      seen.add(player1Id);
      seen.add(player2Id);
    }
    if (byePlayerId) seen.add(byePlayerId);
    expect(seen.size).toBe(n);

    if (n % 2 === 0) {
      expect(byePlayerId).toBeNull();
      expect(pairings).toHaveLength(n / 2);
    } else {
      expect(byePlayerId).not.toBeNull();
      expect(pairings).toHaveLength((n - 1) / 2);
    }
  });

  it("throws for fewer than 4 players", () => {
    expect(() => generateRound1Pairings(seats(3))).toThrow();
  });
});

describe("generateSwissPairings", () => {
  function makePlayers(n: number, overrides: Partial<PairingPlayer>[] = []): PairingPlayer[] {
    return seats(n).map((id, i) => ({
      id,
      seatIndex: i,
      matchPoints: 0,
      byesReceivedThisSeason: 0,
      ...(overrides[i] ?? {}),
    }));
  }

  it("never repeats an opponent from a previous round", () => {
    const players = makePlayers(8);
    const previousOpponents = new Map<string, Set<string>>(
      players.map((p) => [p.id, new Set<string>()]),
    );
    // Round 1 already happened: p0-p4, p1-p5, p2-p6, p3-p7 (per the round-1 algorithm).
    const round1 = [
      ["p0", "p4"],
      ["p1", "p5"],
      ["p2", "p6"],
      ["p3", "p7"],
    ];
    for (const [a, b] of round1) {
      previousOpponents.get(a)!.add(b);
      previousOpponents.get(b)!.add(a);
    }

    const { pairings } = generateSwissPairings(players, previousOpponents, 8);
    for (const { player1Id, player2Id } of pairings) {
      expect(previousOpponents.get(player1Id)!.has(player2Id)).toBe(false);
    }
    // Perfect matching: all 8 players covered exactly once.
    const seen = pairings.flatMap((p) => [p.player1Id, p.player2Id]);
    expect(new Set(seen).size).toBe(8);
  });

  it("prefers seat-non-adjacent opponents when match points and rematch history don't force a choice", () => {
    // 4 players all tied at 0 points, no history — p0 should avoid its seat neighbors p1 and p3,
    // pairing with p2 (directly across) instead.
    const players = makePlayers(4);
    const previousOpponents = new Map<string, Set<string>>(players.map((p) => [p.id, new Set<string>()]));
    const { pairings } = generateSwissPairings(players, previousOpponents, 4);
    const p0Pair = pairings.find((p) => p.player1Id === "p0" || p.player2Id === "p0");
    const partner = p0Pair!.player1Id === "p0" ? p0Pair!.player2Id : p0Pair!.player1Id;
    expect(partner).toBe("p2");
  });

  it("gives the bye to whoever has had the fewest byes this season, tiebroken by lowest match points", () => {
    const players = makePlayers(7, [
      { byesReceivedThisSeason: 1 },
      { byesReceivedThisSeason: 1 },
      { byesReceivedThisSeason: 1 },
      { byesReceivedThisSeason: 2 },
      { byesReceivedThisSeason: 2 },
      { byesReceivedThisSeason: 0, matchPoints: 3 },
      { byesReceivedThisSeason: 0, matchPoints: 0 },
    ]);
    const previousOpponents = new Map<string, Set<string>>(players.map((p) => [p.id, new Set<string>()]));
    const { byePlayerId } = generateSwissPairings(players, previousOpponents, 7);
    // p6 has 0 byes (tied with p5) but lower match points, so it should get the bye.
    expect(byePlayerId).toBe("p6");
  });

  it("throws when no valid perfect matching exists (everyone has already played everyone)", () => {
    const players = makePlayers(4);
    const previousOpponents = new Map<string, Set<string>>(
      players.map((p) => [p.id, new Set(players.map((q) => q.id).filter((id) => id !== p.id))]),
    );
    expect(() => generateSwissPairings(players, previousOpponents, 4)).toThrow();
  });
});

describe("computeStandingsState", () => {
  it("tallies match points and opponent history from raw match rows, including byes", () => {
    const seatOrder = seats(5);
    const { players, previousOpponents } = computeStandingsState(
      seatOrder,
      [
        { player1Id: "p0", player2Id: "p1", outcome: "p1_win" },
        { player1Id: "p2", player2Id: "p3", outcome: "draw" },
        { player1Id: "p4", player2Id: null, outcome: "bye" },
      ],
      { p4: 1 },
    );

    const byId = Object.fromEntries(players.map((p) => [p.id, p]));
    expect(byId.p0.matchPoints).toBe(3);
    expect(byId.p1.matchPoints).toBe(0);
    expect(byId.p2.matchPoints).toBe(1);
    expect(byId.p3.matchPoints).toBe(1);
    expect(byId.p4.matchPoints).toBe(3);
    expect(byId.p4.byesReceivedThisSeason).toBe(1);

    expect(previousOpponents.get("p0")!.has("p1")).toBe(true);
    expect(previousOpponents.get("p2")!.has("p3")).toBe(true);
    expect(previousOpponents.get("p4")!.size).toBe(0);
  });
});
