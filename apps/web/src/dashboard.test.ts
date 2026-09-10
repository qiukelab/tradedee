import { describe, expect, it } from "vitest";

import { marketSignal } from "./dashboard";

describe("marketSignal", () => {
  it("marks a high-confidence positive edge as enter", () => {
    expect(marketSignal({ probability: 0.54, fairValue: 0.61, confidence: 0.72 })).toEqual({ label: "Enter", tone: "positive" });
  });

  it("marks a low-confidence edge as watch", () => {
    expect(marketSignal({ probability: 0.54, fairValue: 0.61, confidence: 0.50 })).toEqual({ label: "Watch", tone: "watch" });
  });
});
