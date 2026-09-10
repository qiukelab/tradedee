import type { Locale } from "./terminal";
import { probability } from './beginner/market-model';

export type LandingMarket = {
  id: string;
  question: string;
  yes_probability: number;
  liquidity: number;
  volume_24h: number;
  image: string | null;
  price_change_1d: number | null;
  spread: number | null;
};

export function formatProbability(value: number, locale: Locale): string {
  return probability(value, locale);
}

export function rankHeroMarkets<T extends LandingMarket>(markets: T[]): T[] {
  return [...markets].sort((a, b) => score(b) - score(a));
}

function score(market: LandingMarket): number {
  const activity = Math.log10(Math.max(1, market.volume_24h)) * 4;
  const depth = Math.log10(Math.max(1, market.liquidity));
  return activity + depth;
}

export function riskPreview(bankroll: number, requestedStake: number) {
  const safeBankroll = Math.max(0, bankroll);
  const stake = Math.min(safeBankroll, Math.max(0, requestedStake));
  return { stake, maximumLoss: stake, exposurePercent: safeBankroll ? (stake / safeBankroll) * 100 : 0 };
}
