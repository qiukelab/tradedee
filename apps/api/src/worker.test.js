import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { reserveBudget, refreshMarket } from "./tasks.js";
test("budget reserves before AI calls and blocks overspend", async () => {
  const db = new PGlite();
  await db.exec(
    await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
  );
  await assert.rejects(reserveBudget(db, 1));
  await db.query("UPDATE settings SET value=value||$1::jsonb", [
    JSON.stringify({ ai_enabled: true, daily_budget: 2 }),
  ]);
  const a = await reserveBudget(db, 1.5);
  assert.ok(a.id);
  await assert.rejects(reserveBudget(db, 1));
  assert.equal(
    (await db.query("SELECT count(*)::int n FROM ai_usage")).rows[0].n,
    1,
  );
  await db.close();
});
test("market ingestion excludes open candles and uses exchange timestamp", async () => {
  const db = new PGlite();
  await db.exec(
    await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
  );
  const fake = async (url) =>
    new Response(
      JSON.stringify(
        String(url).includes("ticker")
          ? [
              {
                symbol: "BTCUSDT",
                lastPrice: "100",
                priceChangePercent: "2",
                closeTime: 1000,
              },
              {
                symbol: "ETHUSDT",
                lastPrice: "50",
                priceChangePercent: "1",
                closeTime: 1000,
              },
              {
                symbol: "SOLUSDT",
                lastPrice: "10",
                priceChangePercent: "0",
                closeTime: 1000,
              },
            ]
          : [
              [0, "1", "2", "1", "2", "1", 999],
              [1000, "1", "2", "1", "2", "1", Date.now() + 100000],
            ],
      ),
    );
  await refreshMarket(db, fake);
  assert.equal(
    (await db.query("SELECT count(*)::int n FROM candles")).rows[0].n,
    9,
  );
  assert.equal(
    new Date(
      (
        await db.query("SELECT as_of FROM assets WHERE symbol='BTCUSDT'")
      ).rows[0].as_of,
    ).getTime(),
    1000,
  );
  await db.close();
});
