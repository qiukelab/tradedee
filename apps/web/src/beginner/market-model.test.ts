import { describe, it, expect } from "vitest";
import {
  simulate,
  dataState,
  probability,
  rankStories,
  type Market,
} from "./market-model";
const market: Market = {
  id: "a",
  question: "Example?",
  slug: "example",
  yes_probability: 0.6,
  liquidity: 1000,
  volume_24h: 500,
  spread: 0.02,
  price_change_1d: null,
  end_date: "2027-01-01",
  image: null,
  source_language: "en",
};
describe("beginner data and educational payoff", () => {
  it("calculates both sides without confusing proceeds and profit", () => {
    expect(simulate(0.6, "yes", 60, "fresh")).toMatchObject({
      shares: 100,
      payoutIfCorrect: 100,
      profitIfCorrect: 40,
      maximumLoss: 60,
      balanceIfWrong: 940,
    });
    expect(simulate(0.6, "no", 40, "fresh")).toMatchObject({
      shares: 100,
      payoutIfCorrect: 100,
      profitIfCorrect: 60,
      balanceIfWrong: 960,
    });
  });
  it("rejects stale, invalid prices, empty, nonfinite and excessive stakes", () => {
    for (const state of ["stale", "error", "loading", "empty"] as const)
      expect(simulate(0.6, "yes", 10, state)).toBeNull();
    for (const p of [0, 1, NaN, Infinity, -0.1, 1.1])
      expect(simulate(p, "yes", 10, "fresh")).toBeNull();
    for (const stake of [0, -1, NaN, Infinity, 1001])
      expect(simulate(0.6, "no", stake, "fresh")).toBeNull();
  });
  it("does not print tiny probabilities or round near certainty to 100%", () => {
    expect(probability(0.0005, "th")).toBe("โอกาสต่ำกว่า 1%");
    expect(probability(0.0005, "en")).toBe("Below 1% probability");
    expect(probability(0.9999, "en")).toBe("Above 99%, not 100%");
    expect(probability(null, "en")).toBe("Not available");
  });
  it("keeps missing and retained stale data distinct from fresh", () => {
    const at = "2026-09-10T00:00:00Z",
      now = Date.parse(at);
    expect(dataState(true, false, [])).toBe("loading");
    expect(dataState(false, true, [])).toBe("error");
    expect(dataState(false, false, [])).toBe("empty");
    expect(dataState(false, false, [market], "fresh", at, now)).toBe("fresh");
    expect(dataState(false, true, [market], "fresh", at, now)).toBe("stale");
    expect(dataState(false, false, [market], "fresh", at, now + 121000)).toBe(
      "stale",
    );
    expect(dataState(false, false, [market], "fresh")).toBe("stale");
  });
  it("ranks by activity, excludes invalid data and ignores image presence", () => {
    expect(
      rankStories([
        { ...market, id: "inactive", volume_24h: 0, image: "person.jpg" },
        market,
        { ...market, id: "bad", yes_probability: NaN },
      ]).map((m) => m.id),
    ).toEqual(["a", "inactive"]);
    expect(
      rankStories([{ ...market, id: "b", image: "person.jpg" }, market])[0].id,
    ).toBe("a");
  });
});
