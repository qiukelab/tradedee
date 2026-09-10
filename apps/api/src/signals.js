import { z } from "zod";
export function indicators(candles) {
  if (candles.length < 200)
    throw new Error("ต้องมีแท่งเทียนที่ปิดแล้วอย่างน้อย 200 แท่ง");
  for (const c of candles)
    if (
      !["open", "high", "low", "close", "volume"].every((k) =>
        Number.isFinite(c[k]),
      ) ||
      c.open <= 0 || c.low <= 0 ||
      c.high < Math.max(c.open, c.close) ||
      c.low > Math.min(c.open, c.close) ||
      c.volume < 0
    )
      throw new Error("invalid candle");
  const ema = (n) =>
    candles
      .slice(n)
      .reduce(
        (v, c) => v + ((c.close - v) * 2) / (n + 1),
        candles.slice(0, n).reduce((s, c) => s + c.close, 0) / n,
      );
  let gain = 0,
    loss = 0,
    atr = 0;
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i],
      p = candles[i - 1],
      d = c.close - p.close,
      tr = Math.max(
        c.high - c.low,
        Math.abs(c.high - p.close),
        Math.abs(c.low - p.close),
      );
    if (i <= 14) {
      gain += Math.max(d, 0) / 14;
      loss += Math.max(-d, 0) / 14;
      atr += tr / 14;
    } else {
      gain = (gain * 13 + Math.max(d, 0)) / 14;
      loss = (loss * 13 + Math.max(-d, 0)) / 14;
      atr = (atr * 13 + tr) / 14;
    }
  }
  const last = candles.at(-1),
    volume = candles.slice(-21, -1).reduce((s, c) => s + c.volume, 0) / 20;
  const rsi =
      loss === 0 ? (gain === 0 ? 50 : 100) : 100 - 100 / (1 + gain / loss),
    e9 = ema(9),
    e21 = ema(21),
    ratio = volume > 0 ? last.volume / volume : 0;
  const eligible =
    e9 > e21 &&
    rsi >= 50 &&
    rsi <= 70 &&
    ratio >= 1.5 &&
    atr > 0 &&
    last.high - 1.5 * atr > 0;
  return {
    ema9: e9,
    ema21: e21,
    rsi14: rsi,
    atr14: atr,
    volume_ratio: ratio,
    plan: eligible
      ? {
          entry: last.high,
          stop: last.high - 1.5 * atr,
          target: last.high + 3 * atr,
        }
      : null,
  };
}
const analysisSchema = z
  .object({
    summary: z.string().min(1).max(2000),
    positive: z.array(z.string().max(500)).max(5),
    negative: z.array(z.string().max(500)).max(5),
    limitations: z.array(z.string().max(500)).min(1).max(5),
    source_ids: z.array(z.string()).max(20),
    wait: z.boolean().default(false),
  })
  .strict();
export function validateAnalysis(value, news) {
  const result = analysisSchema.parse(value);
  if (result.source_ids.some((id) => !news.some((n) => n.id === id)))
    throw new Error("unknown source");
  return result;
}
