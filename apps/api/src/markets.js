import { createMarketsResponse } from "@polylove/contracts";

const GAMMA_URL = "https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100";

function number(value, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function sourceLanguage(question) { return /[\u0E00-\u0E7F]/.test(question) ? "th" : "en"; }

export function normalizeGammaMarket(raw) {
  const outcomes = JSON.parse(raw.outcomes ?? "[]");
  const prices = JSON.parse(raw.outcomePrices ?? "[]");
  const yesIndex = outcomes.indexOf("Yes");
  const yesProbability = number(prices[yesIndex], -1);
  if (!raw.id || !raw.question || yesProbability <= 0 || yesProbability >= 1) throw new Error("invalid Gamma market");
  return {
    id: String(raw.id), question: String(raw.question), slug: String(raw.slug ?? ""), yes_probability: yesProbability,
    liquidity: number(raw.liquidity), volume_24h: number(raw.volume24hr ?? raw.volume24h),
    spread: raw.spread === null || raw.spread === undefined || raw.spread === "" ? null : number(raw.spread),
    price_change_1d: raw.oneDayPriceChange === null || raw.oneDayPriceChange === undefined || raw.oneDayPriceChange === "" ? null : number(raw.oneDayPriceChange),
    end_date: raw.endDate ? new Date(raw.endDate).toISOString() : null, image: raw.image ? String(raw.image) : null,
    source_language: sourceLanguage(String(raw.question)),
  };
}

export class GammaMarketCache {
  #load; #now; #ttl; #cached;
  constructor(load, now = () => new Date(), ttl = 30_000) { this.#load = load; this.#now = now; this.#ttl = ttl; this.#cached = null; }
  async list(limit = 50, forceRefresh = false) {
    const boundedLimit = Math.max(1, Math.min(Number(limit) || 50, 50));
    const now = this.#now();
    if (this.#cached && !forceRefresh && now - this.#cached.at < this.#ttl) return createMarketsResponse(this.#cached.items.slice(0, boundedLimit), this.#cached.asOf, "fresh");
    try {
      const records = await this.#load();
      const items = records.map(normalizeGammaMarket).sort((a, b) => b.liquidity - a.liquidity).slice(0, 50);
      const asOf = now.toISOString();
      this.#cached = { items, at: now, asOf };
      return createMarketsResponse(items.slice(0, boundedLimit), asOf, "fresh");
    } catch (error) {
      if (this.#cached) return createMarketsResponse(this.#cached.items.slice(0, boundedLimit), this.#cached.asOf, "stale");
      throw error;
    }
  }
}

export function createGammaCache(fetchFn = fetch) {
  return new GammaMarketCache(async () => {
    const response = await fetchFn(GAMMA_URL);
    if (!response.ok) throw new Error(`Gamma returned ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload)) throw new Error("Gamma returned an invalid payload");
    return payload;
  });
}
