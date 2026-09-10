import test from "node:test";
import assert from "node:assert/strict";

import { GammaMarketCache, normalizeGammaMarket } from "./markets.js";

const gamma = (id, liquidity, price = "0.6") => ({ id, question: `Will market ${id} resolve Yes?`, slug: `market-${id}`, outcomes: '["Yes","No"]', outcomePrices: `["${price}","${1 - Number(price)}"]`, liquidity: String(liquidity), volume24hr: "22", spread: "0.02", oneDayPriceChange: "0.01", active: true });

test("normalizes Gamma market values", () => {
  assert.deepEqual(normalizeGammaMarket(gamma("a", 100)).yes_probability, 0.6);
});

test("sorts by liquidity and reuses cached values as stale after an upstream failure", async () => {
  let fail = false;
  const cache = new GammaMarketCache(async () => {
    if (fail) throw new Error("timeout");
    return [gamma("low", 10), gamma("high", 100)];
  }, () => new Date("2026-09-10T00:00:00Z"));
  const fresh = await cache.list(1);
  fail = true;
  const stale = await cache.list(1, true);

  assert.equal(fresh.items[0].id, "high");
  assert.equal(fresh.data_freshness, "fresh");
  assert.equal(stale.data_freshness, "stale");
});
