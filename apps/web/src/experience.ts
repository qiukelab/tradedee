export type AppView = "landing" | "terminal";

export function initialView(search: string): AppView { return new URLSearchParams(search).get("view") === "terminal" ? "terminal" : "landing"; }
export function terminalUrl(section = "overview"): string { return `?view=terminal#${section}`; }
export function useCinematicMotion(reducedMotion: boolean): boolean { return !reducedMotion; }

/** Keep the live board populated; presentation decides whether a probability is meaningful enough to print. */
export function displayableMarkets<T extends { yes_probability: number }>(items: T[]): T[] {
  return items;
}

export function shouldShowProbability(probability: number): boolean { return probability >= 0.01; }
