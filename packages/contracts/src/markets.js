/** @typedef {{ id: string, question: string, slug: string, yes_probability: number, liquidity: number, volume_24h: number, spread: number | null, price_change_1d: number | null, end_date: string | null, image: string | null, source_language: string }} Market */
/** @typedef {{ items: Market[], as_of: string, data_freshness: "fresh" | "stale" }} MarketsResponse */

/** @param {Market[]} items @param {string} asOf @param {"fresh" | "stale"} dataFreshness @returns {MarketsResponse} */
export function createMarketsResponse(items, asOf, dataFreshness) {
  return { items, as_of: asOf, data_freshness: dataFreshness };
}
