import { describe, expect, it } from "vitest";
import {
  bonesAvailable,
  claimedOn,
  dailyQuests,
  levelFromXp,
  OUTFITS,
  outfitCondition,
  pruneClaimed,
  TRICKS,
  unlockedOutfits,
  unlockedTricks,
  xpForLevel,
} from "@/lib/progress";
import { longestStreak } from "@/lib/srs/streak";

describe("levelFromXp", () => {
  it("has the documented thresholds", () => {
    expect([1, 2, 3, 4, 5, 10, 20].map(xpForLevel)).toEqual([0, 50, 150, 300, 500, 2250, 9500]);
  });

  it.each([
    [0, 1],
    [49, 1],
    [50, 2],
    [149, 2],
    [150, 3],
    [299, 3],
    [300, 4],
    [2249, 9],
    [2250, 10],
    [9500, 20],
  ])("%i XP is level %i", (xp, level) => {
    expect(levelFromXp(xp).level).toBe(level);
  });

  it("reports progress inside the level", () => {
    expect(levelFromXp(120)).toEqual({ level: 2, xpInLevel: 70, xpForNext: 100, progress: 0.7 });
    expect(levelFromXp(0)).toMatchObject({ level: 1, xpInLevel: 0, xpForNext: 50, progress: 0 });
  });

  it("never goes below level 1 for odd input", () => {
    expect(levelFromXp(-30).level).toBe(1);
    expect(levelFromXp(12.9).xpInLevel).toBe(12);
  });
});

describe("bonesAvailable", () => {
  it("is one per 10 right answers plus two per quest reward, minus what was fed", () => {
    expect(bonesAvailable({ totalCorrect: 95, questsClaimedTotal: 2, treatsFed: 3 })).toBe(9 + 4 - 3);
  });

  it("is never negative", () => {
    expect(bonesAvailable({ totalCorrect: 5, questsClaimedTotal: 0, treatsFed: 4 })).toBe(0);
    expect(bonesAvailable({ totalCorrect: 0, questsClaimedTotal: 0, treatsFed: 0 })).toBe(0);
  });
});

describe("dailyQuests", () => {
  const ids = (q: { id: string }[]) => q.map((x) => x.id);

  it("has the three quests in order", () => {
    expect(ids(dailyQuests({ reviews: 0, correct: 0, new_learned: 0, dueLeft: 0 }))).toEqual(["due", "correct20", "new5"]);
  });

  it("is not done for a day without any study, even with nothing due", () => {
    const [due] = dailyQuests({ reviews: 0, correct: 0, new_learned: 0, dueLeft: 0 });
    expect(due).toMatchObject({ done: false, progress: 0, target: 1 });
  });

  it("finishes the due quest when everything due was reviewed", () => {
    const [due] = dailyQuests({ reviews: 12, correct: 9, new_learned: 0, dueLeft: 0 });
    expect(due).toMatchObject({ done: true, progress: 12, target: 12 });
    expect(dailyQuests({ reviews: 12, correct: 9, new_learned: 0, dueLeft: 4 })[0]).toMatchObject({ done: false, target: 16 });
  });

  it("clamps progress at the target", () => {
    const q = dailyQuests({ reviews: 40, correct: 35, new_learned: 9, dueLeft: 0 });
    expect(q[1]).toMatchObject({ progress: 20, target: 20, done: true });
    expect(q[2]).toMatchObject({ progress: 5, target: 5, done: true });
  });

  it("reads the claimed rewards of one day", () => {
    expect(claimedOn({ "2026-10-24": ["due", "bogus", "new5"] }, "2026-10-24")).toEqual(["due", "new5"]);
    expect(claimedOn({}, "2026-10-24")).toEqual([]);
  });

  it("keeps the newest seven days when pruning", () => {
    const claimed = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`2026-10-${String(i + 10).padStart(2, "0")}`, ["due"]]));
    const kept = Object.keys(pruneClaimed(claimed));
    expect(kept).toHaveLength(7);
    expect(kept[0]).toBe("2026-10-13");
    expect(kept.at(-1)).toBe("2026-10-19");
  });
});

describe("outfits and tricks", () => {
  it("has only the bare outfit at the start", () => {
    expect(unlockedOutfits({ longestStreak: 0, level: 1 })).toEqual(["none"]);
  });

  it("unlocks by streak and by level independently", () => {
    expect(unlockedOutfits({ longestStreak: 7, level: 1 })).toEqual(["none", "scarf", "glasses"]);
    expect(unlockedOutfits({ longestStreak: 0, level: 5 })).toEqual(["none", "bow", "cap"]);
    expect(unlockedOutfits({ longestStreak: 30, level: 10 })).toHaveLength(OUTFITS.length);
  });

  it("names what is missing", () => {
    expect(outfitCondition(OUTFITS.find((o) => o.id === "glasses")!)).toBe("Chuỗi 7 ngày");
    expect(outfitCondition(OUTFITS.find((o) => o.id === "cap")!)).toBe("Cấp 5");
    expect(outfitCondition(OUTFITS[0])).toBeNull();
  });

  it("unlocks tricks by level", () => {
    expect(unlockedTricks(1)).toEqual(["sit"]);
    expect(unlockedTricks(4)).toEqual(["sit", "spin", "rollOver"]);
    expect(unlockedTricks(99)).toHaveLength(TRICKS.length);
  });
});

describe("longestStreak", () => {
  it("is 0 without study days", () => {
    expect(longestStreak([])).toBe(0);
  });

  it("finds the longest run, not the latest one", () => {
    const days = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-10", "2026-10-11"];
    expect(longestStreak(days)).toBe(4);
  });

  it("ignores duplicates and order, and crosses month ends", () => {
    expect(longestStreak(["2026-11-01", "2026-10-31", "2026-10-30", "2026-10-31"])).toBe(3);
  });
});
