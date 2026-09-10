import type { Locale } from "../terminal";

export interface Market {
  id: string;
  question: string;
  slug: string;
  yes_probability: number;
  liquidity: number;
  volume_24h: number;
  spread: number | null;
  price_change_1d: number | null;
  end_date: string | null;
  image: string | null;
  source_language: string;
}
export interface MarketPage {
  items: Market[];
  as_of: string;
  data_freshness: "fresh" | "stale";
}
export type DataState = "loading" | "error" | "stale" | "empty" | "fresh";
export const words = (locale: Locale, th: string, en: string) =>
  locale === "th" ? th : en;
export const validProbability = (p: unknown): p is number =>
  typeof p === "number" && Number.isFinite(p) && p >= 0 && p <= 1;
export function probability(p: unknown, locale: Locale) {
  if (!validProbability(p))
    return words(locale, "ยังไม่มีข้อมูล", "Not available");
  if (p < 0.01) return words(locale, "โอกาสต่ำกว่า 1%", "Below 1% probability");
  if (p > 0.99 && p < 1)
    return words(locale, "มากกว่า 99% แต่ไม่ใช่ 100%", "Above 99%, not 100%");
  return `${new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", { maximumFractionDigits: 1 }).format(p * 100)}%`;
}
export function number(value: unknown, locale: Locale, digits = 2) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
        maximumFractionDigits: digits,
      }).format(value)
    : "—";
}
export const dollars = (value: unknown, locale: Locale) =>
  number(value, locale) === "—" ? "—" : `$${number(value, locale)}`;
export function dateLabel(value: string | undefined | null, locale: Locale) {
  if (!value || !Number.isFinite(Date.parse(value)))
    return words(locale, "ยังไม่ทราบเวลา", "Time unavailable");
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
export function dataState(
  loading: boolean,
  error: boolean,
  items: Market[],
  freshness?: string,
  asOf?: string,
  now = Date.now(),
): DataState {
  if (loading && !items.length) return "loading";
  if (error && !items.length) return "error";
  if (!items.length) return "empty";
  if (
    error ||
    freshness !== "fresh" ||
    !asOf ||
    !Number.isFinite(Date.parse(asOf)) ||
    now - Date.parse(asOf) > 120_000 ||
    Date.parse(asOf) > now + 60_000
  )
    return "stale";
  return "fresh";
}
export function rankStories(items: Market[]) {
  return items
    .filter((m) => m.id && m.question && validProbability(m.yes_probability))
    .slice()
    .sort((a, b) => {
      const score = (m: Market) =>
        Number(Number.isFinite(m.spread) && !!m.end_date) * 2 +
        Math.log10(1 + Math.max(0, m.volume_24h || 0)) * 3 +
        Math.log10(1 + Math.max(0, m.liquidity || 0));
      return score(b) - score(a) || a.id.localeCompare(b.id);
    });
}
/** Educational payoff only: each winning contract settles at one simulated unit. No order or ledger write. */
export function simulate(
  yesProbability: number,
  side: "yes" | "no",
  stake: number,
  state: DataState,
  bankroll = 1000,
) {
  const price = side === "yes" ? yesProbability : 1 - yesProbability;
  if (
    state !== "fresh" ||
    !validProbability(yesProbability) ||
    price <= 0 ||
    price >= 1 ||
    !Number.isFinite(stake) ||
    stake <= 0 ||
    stake > bankroll
  )
    return null;
  const shares = stake / price;
  if (!Number.isFinite(shares) || !Number.isFinite(bankroll - stake + shares)) return null;
  return {
    price,
    shares,
    payoutIfCorrect: shares,
    profitIfCorrect: shares - stake,
    payoutIfWrong: 0,
    maximumLoss: stake,
    balanceIfCorrect: bankroll - stake + shares,
    balanceIfWrong: bankroll - stake,
  };
}
