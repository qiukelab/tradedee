import { Hono } from "hono";
import { cors } from "hono/cors";
import { createGammaCache } from "./markets.js";
import { calculateForecast as runPythonForecast } from "./calculator.js";

export function createApp(dependencies = {}) {
  const app = new Hono();
  const listMarkets = dependencies.listMarkets ?? ((limit) => createGammaCache().list(limit));
  const calculateForecast = dependencies.calculateForecast ?? runPythonForecast;
  app.use("/api/*", cors({ origin: ["http://localhost:3000", "http://localhost:5173"], allowMethods: ["GET", "POST", "PATCH"] }));
  app.get("/health", (context) => context.json({ status: "ok" }));
  app.get("/api/v1/markets", async (context) => {
    const limit = Number(context.req.query("limit") ?? 50);
    try { return context.json(await listMarkets(limit)); }
    catch { return context.json({ detail: "market data is temporarily unavailable" }, 503); }
  });
  app.post("/api/v1/calculations/forecast", async (context) => {
    const payload = await context.req.json().catch(() => null);
    if (!payload || typeof payload.market_probability !== "number") return context.json({ detail: "market_probability is required" }, 422);
    try { return context.json(await calculateForecast(payload)); }
    catch { return context.json({ detail: "calculation service is temporarily unavailable" }, 503); }
  });
  return app;
}
