import { describe, expect, it } from "vitest";
import { HAPTIC_PATTERNS } from "@/lib/haptics";
import { SFX_PLANS, sfxLength, type Sfx } from "@/lib/sfx";

const NAMES = Object.keys(SFX_PLANS) as Sfx[];

describe("sfx plans", () => {
  it("has the twelve sounds of the plan", () => {
    expect([...NAMES].sort()).toEqual(
      ["bark", "boop", "chomp", "combo", "complete", "correct", "flip", "levelUp", "pop", "tick", "whoosh", "wrong"].sort(),
    );
  });

  it.each(NAMES)("%s has voices that start at or after 0 with a positive length and a quiet gain", (name) => {
    const voices = SFX_PLANS[name]({});
    expect(voices.length).toBeGreaterThan(0);
    for (const v of voices) {
      expect(v.at).toBeGreaterThanOrEqual(0);
      expect(v.dur).toBeGreaterThan(0);
      expect(v.gain).toBeGreaterThan(0);
      expect(v.gain).toBeLessThanOrEqual(0.4);
    }
  });

  it("keeps every sound under a second", () => {
    for (const name of NAMES) expect(sfxLength(name)).toBeLessThan(1);
  });

  it("plays the right-answer sound as two notes going up", () => {
    const [a, b] = SFX_PLANS.correct({}) as { freq: number }[];
    expect(a.freq).toBe(660);
    expect(b.freq).toBe(990);
  });

  it("adds the high C to the combo arpeggio from combo 10", () => {
    expect(SFX_PLANS.combo({ combo: 5 })).toHaveLength(3);
    expect(SFX_PLANS.combo({ combo: 10 })).toHaveLength(4);
  });

  it("barks twice and chews three times", () => {
    expect(SFX_PLANS.bark({})).toHaveLength(2);
    expect(SFX_PLANS.chomp({})).toHaveLength(3);
  });

  it("ends the level-up on the same fanfare as the session end, plus a shimmer", () => {
    expect(SFX_PLANS.levelUp({}).length).toBe(SFX_PLANS.complete({}).length + 1);
  });
});

describe("haptic patterns", () => {
  it("has the four patterns of the plan", () => {
    expect(HAPTIC_PATTERNS).toEqual({ light: 10, success: [12, 40, 12], error: [30, 50, 30], heavy: 35 });
  });
});
