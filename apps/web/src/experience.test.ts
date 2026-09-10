import { describe, expect, it } from "vitest";

import { displayableMarkets, initialView, shouldShowProbability, terminalUrl, useCinematicMotion } from "./experience";

describe("experience state", () => {
  it("opens terminal directly from the query parameter", () => {
    expect(initialView("?view=terminal")).toBe("terminal");
    expect(terminalUrl("markets")).toBe("?view=terminal#markets");
  });

  it("disables cinematic animation for reduced motion", () => {
    expect(useCinematicMotion(true)).toBe(false);
    expect(useCinematicMotion(false)).toBe(true);
  });
});

it("keeps live market cards while hiding negligible probability labels", () => {
  const markets = [{ yes_probability: 0.0005 }, { yes_probability: 0.14 }];
  expect(displayableMarkets(markets)).toEqual(markets);
  expect(shouldShowProbability(0.0005)).toBe(false);
  expect(shouldShowProbability(0.14)).toBe(true);
});
