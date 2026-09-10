import { test, expect } from "vitest";
import { priceText, legacyDestination } from "./model";
test("missing prices do not appear as zero", () => {
  expect(priceText(null)).toBe("รอข้อมูล");
  expect(priceText(100)).toContain("100");
});
test("legacy market IDs do not become crypto symbols", () => {
  expect(legacyDestination("?view=terminal&market=123")).toBe("/app");
  expect(legacyDestination("")).toBe(null);
});
