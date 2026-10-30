import { describe, expect, it } from "vitest";
import {
  bonesAvailable,
  claimedOn,
  dailyQuests,
  levelFromXp,
  OUTFITS,
  outfitCondition,
  pruneClaimed,
  sessionGains,
  starsForPercent,
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
  it("is one per 10 right answers plus ledger sum", () => {
    expect(bonesAvailable({ totalCorrect: 95, ledgerSum: 1 })).toBe(9 + 1);
  });

  it("is never negative even when ledgerSum is negative", () => {
    expect(bonesAvailable({ totalCorrect: 5, ledgerSum: -4 })).toBe(0);
    expect(bonesAvailable({ totalCorrect: 50, ledgerSum: -10 })).toBe(0);
    expect(bonesAvailable({ totalCorrect: 0, ledgerSum: 0 })).toBe(0);
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

describe("sessionGains", () => {
  const base = { correctBefore: 20, correctAfter: 30, streakNow: 1, extendedStreak: false };

  it("finds the level before and after and flags a level-up", () => {
    // 47 XP is level 1, 52 XP is level 2
    const g = sessionGains({ ...base, xpBefore: 47, xpAfter: 52 });
    expect(g.before.level).toBe(1);
    expect(g.after.level).toBe(2);
    expect(g.leveledUp).toBe(true);
    expect(g.xpGained).toBe(5);
  });

  it("stays on the level when the XP does not cross a threshold", () => {
    const g = sessionGains({ ...base, xpBefore: 65, xpAfter: 70 });
    expect(g.leveledUp).toBe(false);
    expect(g.before.level).toBe(g.after.level);
  });

  it("counts a bone for every 10 right answers crossed", () => {
    const g = (before: number, after: number) => sessionGains({ ...base, xpBefore: 60, xpAfter: 70, correctBefore: before, correctAfter: after }).bonesEarned;
    expect(g(29, 34)).toBe(1);
    expect(g(30, 34)).toBe(0);
    expect(g(15, 40)).toBe(3);
  });

  it("never reports a negative gain when the totals are out of step", () => {
    const g = sessionGains({ ...base, xpBefore: 80, xpAfter: 70, correctBefore: 30, correctAfter: 20 });
    expect(g.xpGained).toBe(0);
    expect(g.bonesEarned).toBe(0);
    expect(g.leveledUp).toBe(false);
  });

  it("opens the outfits and tricks of the level reached", () => {
    // level 2 at 50 XP unlocks the "spin" trick; level 3 (150 XP) the bow
    const two = sessionGains({ ...base, xpBefore: 45, xpAfter: 55 });
    expect(two.newTricks.map((t) => t.id)).toEqual(["spin"]);
    const three = sessionGains({ ...base, xpBefore: 145, xpAfter: 155 });
    expect(three.newOutfits.map((o) => o.id)).toEqual(["bow"]);
  });

  it("opens a streak outfit only on the session that reaches the mark", () => {
    const hit = sessionGains({ ...base, xpBefore: 60, xpAfter: 70, streakNow: 3, extendedStreak: true });
    expect(hit.newOutfits.map((o) => o.id)).toEqual(["scarf"]);
    const later = sessionGains({ ...base, xpBefore: 60, xpAfter: 70, streakNow: 3, extendedStreak: false });
    expect(later.newOutfits).toEqual([]);
  });
});

describe("starsForPercent", () => {
  it("gives 3 stars from 90%, 2 from 60%, else 1", () => {
    expect([100, 90, 89, 60, 59, 0].map(starsForPercent)).toEqual([3, 3, 2, 2, 1, 1]);
  });
});
