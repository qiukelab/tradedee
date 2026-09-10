import test from "node:test";
import assert from "node:assert/strict";

import { calculateForecast } from "./calculator.js";

test("invokes the private Python calculator regardless of the API working directory", async () => {
  const forecast = await calculateForecast({ market_probability: 0.62 });

  assert.equal(forecast.market_probability, 0.62);
});
