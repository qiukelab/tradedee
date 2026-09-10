import { describe, expect, it } from "vitest";

import { formatProbability, rankHeroMarkets, riskPreview } from "./landing-model";

const market = (overrides: Partial<{ id: string; question: string; yes_probability: number; liquidity: number; volume_24h: number; image: string | null; price_change_1d: number | null; spread: number | null }> = {}) => ({
  id: overrides.id ?? "market",
  question: overrides.question ?? "Will this market resolve yes?",
  yes_probability: overrides.yes_probability ?? 0.52,
  liquidity: overrides.liquidity ?? 100_000,
  volume_24h: overrides.volume_24h ?? 50_000,
  image: overrides.image ?? "https://example.com/market.jpg",
  price_change_1d: overrides.price_change_1d ?? 0.02,
  spread: overrides.spread ?? 0.01,
});

describe("landing market view model", () => {
  it("labels probabilities below one percent without printing the tiny value", () => {
    expect(formatProbability(0.0005, "en")).toBe("Below 1% probability");
    expect(formatProbability(0.0005, "th")).toBe("โอกาสต่ำกว่า 1%");
    expect(formatProbability(0.42, "en")).toBe("42%");
  });

  it("ranks active markets by volume ahead of inactive liquidity traps", () => {
    const ranked = rankHeroMarkets([
      market({ id: "liquid-only", liquidity: 2_000_000, volume_24h: 0, image: null }),
      market({ id: "active", liquidity: 600_000, volume_24h: 250_000 }),
    ]);
    expect(ranked[0].id).toBe("active");
  });

  it("caps the paper preview stake to available bankroll", () => {
    expect(riskPreview(1_000, 1_400)).toEqual({ stake: 1_000, maximumLoss: 1_000, exposurePercent: 100 });
    expect(riskPreview(10_000, 250)).toEqual({ stake: 250, maximumLoss: 250, exposurePercent: 2.5 });
  });
});
