import test from "node:test";
import assert from "node:assert/strict";

import { createMarketsResponse } from "./markets.js";

test("creates a market response with freshness metadata", () => {
  const response = createMarketsResponse([], "2026-09-10T00:00:00.000Z", "fresh");

  assert.deepEqual(response, { items: [], as_of: "2026-09-10T00:00:00.000Z", data_freshness: "fresh" });
});
