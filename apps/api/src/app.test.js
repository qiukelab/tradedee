import test from "node:test";
import assert from "node:assert/strict";

import { createApp } from "./app.js";

test("exposes live market data from one Hono API", async () => {
  const app = createApp({ listMarkets: async () => ({ items: [], as_of: "2026-09-10T00:00:00Z", data_freshness: "fresh" }) });
  const response = await app.request("http://localhost/api/v1/markets");

  assert.equal(response.status, 200);
  assert.equal((await response.json()).data_freshness, "fresh");
});

test("returns a calculation response from the private Python runtime", async () => {
  const app = createApp({ calculateForecast: async () => ({ market_probability: 0.62, fair_probability: null, limitations: ["not calibrated"] }) });
  const response = await app.request("http://localhost/api/v1/calculations/forecast", { method: "POST", body: JSON.stringify({ market_probability: 0.62 }), headers: { "Content-Type": "application/json" } });

  assert.equal(response.status, 200);
  assert.equal((await response.json()).market_probability, 0.62);
});
