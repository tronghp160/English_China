import { describe, expect, it } from "vitest";
import { LINES, say, seedOf, summaryMood } from "@/lib/mascot/lines";
import { readPrefs } from "@/lib/validation";

describe("mascot lines", () => {
  it("picks the same line for the same seed", () => {
    expect(say("correct", { seed: 7 })).toBe(say("correct", { seed: 7 }));
    expect(seedOf("abc")).toBe(seedOf("abc"));
    expect(seedOf("a-very-long-word-id-0123456789")).toBeGreaterThanOrEqual(0);
  });

  it("fills {name} and {n}", () => {
    const text = say("streakAtRisk", { seed: 1, name: "Mochi", n: 12 });
    expect(text).toContain("Mochi");
    expect(text).toContain("12");
    expect(text).not.toMatch(/\{(name|n)\}/);
  });

  it("covers every line with any seed", () => {
    for (const key of Object.keys(LINES) as (keyof typeof LINES)[])
      for (let seed = 0; seed < 10; seed++) expect(say(key, { seed, n: 3 })).toBeTruthy();
  });

  it("maps accuracy to a mood", () => {
    expect(summaryMood(95).mood).toBe("cheer");
    expect(summaryMood(50).mood).toBe("happy");
    expect(summaryMood(10).mood).toBe("sad");
  });
});

describe("mascot prefs", () => {
  it("is on with the default name", () => {
    const p = readPrefs({});
    expect(p.mascot).toBe(true);
    expect(p.mascot_name).toBe("Bơ");
  });

  it("keeps a stored name and switch", () => {
    const p = readPrefs({ mascot: false, mascot_name: "Mochi" });
    expect(p.mascot).toBe(false);
    expect(p.mascot_name).toBe("Mochi");
  });
});
