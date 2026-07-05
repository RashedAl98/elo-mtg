import { describe, expect, it } from "vitest";
import { applyEloUpdate, expectedScore, kFactor, movMultiplier, scoreForPlayer1 } from "./elo";

describe("expectedScore", () => {
  it("is 0.5 for equal ratings", () => {
    expect(expectedScore(1500, 1500)).toBeCloseTo(0.5, 6);
  });

  it("matches the well-known ~0.76 value for a 200 point favorite", () => {
    expect(expectedScore(1600, 1400)).toBeCloseTo(0.7597, 3);
    expect(expectedScore(1400, 1600)).toBeCloseTo(0.2403, 3);
  });
});

describe("kFactor", () => {
  it("is provisional (40) for the first 5 games of a season", () => {
    expect(kFactor(0)).toBe(40);
    expect(kFactor(4)).toBe(40);
  });

  it("drops to 24 from the 5th game onward", () => {
    expect(kFactor(5)).toBe(24);
    expect(kFactor(50)).toBe(24);
  });
});

describe("movMultiplier", () => {
  it("is 1.0 for a 2-0 sweep or a draw", () => {
    expect(movMultiplier("p1_2_0")).toBe(1.0);
    expect(movMultiplier("p2_2_0")).toBe(1.0);
    expect(movMultiplier("draw")).toBe(1.0);
  });

  it("is 0.75 for a closer 2-1 win", () => {
    expect(movMultiplier("p1_2_1")).toBe(0.75);
    expect(movMultiplier("p2_2_1")).toBe(0.75);
  });
});

describe("scoreForPlayer1", () => {
  it("returns 1/0/0.5 for win/loss/draw", () => {
    expect(scoreForPlayer1("p1_2_0")).toBe(1);
    expect(scoreForPlayer1("p1_2_1")).toBe(1);
    expect(scoreForPlayer1("p2_2_0")).toBe(0);
    expect(scoreForPlayer1("p2_2_1")).toBe(0);
    expect(scoreForPlayer1("draw")).toBe(0.5);
  });
});

describe("applyEloUpdate", () => {
  it("moves equal-rated provisional players by +/-20 on a 2-0 win", () => {
    const result = applyEloUpdate({
      p1Rating: 1500,
      p2Rating: 1500,
      p1GamesPlayed: 0,
      p2GamesPlayed: 0,
      outcome: "p1_2_0",
    });
    expect(result.p1Delta).toBe(20);
    expect(result.p2Delta).toBe(-20);
    expect(result.p1RatingAfter).toBe(1520);
    expect(result.p2RatingAfter).toBe(1480);
  });

  it("moves equal-rated provisional players by a smaller +/-15 on a closer 2-1 win", () => {
    const result = applyEloUpdate({
      p1Rating: 1500,
      p2Rating: 1500,
      p1GamesPlayed: 0,
      p2GamesPlayed: 0,
      outcome: "p1_2_1",
    });
    expect(result.p1Delta).toBe(15);
    expect(result.p2Delta).toBe(-15);
  });

  it("leaves ratings unchanged on a draw between equal players", () => {
    const result = applyEloUpdate({
      p1Rating: 1500,
      p2Rating: 1500,
      p1GamesPlayed: 0,
      p2GamesPlayed: 0,
      outcome: "draw",
    });
    expect(result.p1Delta).toBe(0);
    expect(result.p2Delta).toBe(0);
  });

  it("awards a favorite less for winning than an underdog would gain, and deltas cancel out under equal K", () => {
    const result = applyEloUpdate({
      p1Rating: 1600,
      p2Rating: 1400,
      p1GamesPlayed: 0,
      p2GamesPlayed: 0,
      outcome: "p1_2_0",
    });
    expect(result.p1Delta).toBeGreaterThan(0);
    expect(result.p1Delta).toBeLessThan(20);
    expect(result.p2Delta).toBe(-result.p1Delta);
  });

  it("applies each player's own K based on their own season game count", () => {
    // p1 is out of provisional (K=24), p2 is still provisional (K=40).
    const result = applyEloUpdate({
      p1Rating: 1500,
      p2Rating: 1500,
      p1GamesPlayed: 10,
      p2GamesPlayed: 0,
      outcome: "p1_2_0",
    });
    expect(result.p1Delta).toBe(12); // round(24 * 1 * 0.5)
    expect(result.p2Delta).toBe(-20); // round(40 * 1 * 0.5)
  });
});
