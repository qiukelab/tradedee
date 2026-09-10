import { describe, expect, it } from "vitest";

import { activeSection, readLocale, t, writeLocale } from "./terminal";

describe("terminal localization", () => {
  it("persists Thai or English and translates interface copy", () => {
    const storage = new Map<string, string>();
    const local = { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) };

    writeLocale(local, "en");

    expect(readLocale(local)).toBe("en");
    expect(t("en", "markets")).toBe("Markets");
    expect(t("th", "markets")).toBe("ตลาด");
  });
});

describe("bottom dock", () => {
  it("uses the section with the closest visible top as the active destination", () => {
    expect(activeSection([{ id: "overview", top: -120 }, { id: "markets", top: 30 }, { id: "signals", top: 410 }])).toBe("markets");
  });
});
