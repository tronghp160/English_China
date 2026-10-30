import { describe, expect, it } from "vitest";
import {
  BUDDIES,
  eggCondition,
  eggsEarned,
  hatchProgress,
  isBuddySpecies,
  type BuddySpecies,
} from "@/lib/bin/buddies";

describe("lib/bin/buddies", () => {
  it("formats eggCondition correctly for all buddies", () => {
    const miu = BUDDIES.find((b) => b.species === "miu")!;
    const panda = BUDDIES.find((b) => b.species === "panda")!;
    const duck = BUDDIES.find((b) => b.species === "duck")!;
    const bunny = BUDDIES.find((b) => b.species === "bunny")!;

    expect(eggCondition(miu)).toBe("Thuộc 25 từ");
    expect(eggCondition(panda)).toBe("Thuộc 25 từ tiếng Trung");
    expect(eggCondition(duck)).toBe("Thuộc 25 từ tiếng Anh");
    expect(eggCondition(bunny)).toBe("Thuộc 100 từ");
  });

  it("calculates eggsEarned based on mastered counts and already owned species", () => {
    // 24 words zh -> no panda
    expect(eggsEarned({ en: 0, zh: 24 }, new Set())).toEqual([]);

    // 25 words zh -> panda AND miu (since any = 25 >= 25)
    expect(eggsEarned({ en: 0, zh: 25 }, new Set())).toEqual(["miu", "panda"]);

    // If miu is already owned, only panda is earned
    expect(eggsEarned({ en: 0, zh: 25 }, new Set<BuddySpecies>(["miu"]))).toEqual(["panda"]);

    // If both are already owned, neither is earned
    expect(eggsEarned({ en: 0, zh: 25 }, new Set<BuddySpecies>(["miu", "panda"]))).toEqual([]);

    // 'any' combines en and zh
    // 15 en + 10 zh = 25 -> miu only (en < 25 and zh < 25)
    expect(eggsEarned({ en: 15, zh: 10 }, new Set())).toEqual(["miu"]);

    // 25 en + 0 zh -> miu + duck
    expect(eggsEarned({ en: 25, zh: 0 }, new Set())).toEqual(["miu", "duck"]);

    // 50 en + 50 zh = 100 -> miu, panda, duck, bunny
    expect(eggsEarned({ en: 50, zh: 50 }, new Set())).toEqual(["miu", "panda", "duck", "bunny"]);
  });

  it("calculates hatchProgress correctly across boundaries", () => {
    // When no new answers after egg arrived
    expect(hatchProgress({ totalCorrect: 100, startCorrect: 100, need: 30 })).toEqual({
      done: 0,
      need: 30,
      ready: false,
    });

    // When totalCorrect is somehow less than startCorrect (safety guard)
    expect(hatchProgress({ totalCorrect: 90, startCorrect: 100, need: 30 })).toEqual({
      done: 0,
      need: 30,
      ready: false,
    });

    // In progress
    expect(hatchProgress({ totalCorrect: 115, startCorrect: 100, need: 30 })).toEqual({
      done: 15,
      need: 30,
      ready: false,
    });

    // Exactly ready
    expect(hatchProgress({ totalCorrect: 130, startCorrect: 100, need: 30 })).toEqual({
      done: 30,
      need: 30,
      ready: true,
    });

    // More than need (clamped at need)
    expect(hatchProgress({ totalCorrect: 150, startCorrect: 100, need: 30 })).toEqual({
      done: 30,
      need: 30,
      ready: true,
    });
  });

  it("validates isBuddySpecies", () => {
    expect(isBuddySpecies("miu")).toBe(true);
    expect(isBuddySpecies("panda")).toBe(true);
    expect(isBuddySpecies("duck")).toBe(true);
    expect(isBuddySpecies("bunny")).toBe(true);
    expect(isBuddySpecies("dog")).toBe(false);
    expect(isBuddySpecies(null)).toBe(false);
    expect(isBuddySpecies(123)).toBe(false);
  });
});
