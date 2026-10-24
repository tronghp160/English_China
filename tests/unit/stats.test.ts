import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/srs/streak";
import { summarize30 } from "@/lib/stats";

describe("summarize30", () => {
  const today = "2026-10-25";

  it("returns null retention and zero reviews when there is no data", () => {
    const res = summarize30([], today);
    expect(res.last30).toHaveLength(30);
    expect(res.reviews30).toBe(0);
    expect(res.correct30).toBe(0);
    expect(res.activeDays30).toBe(0);
    expect(res.retention).toBeNull();
    expect(res.perActiveDay).toBe(0);
    expect(res.best.reviews).toBe(0);
  });

  it("calculates statistics correctly when all 30 days have data", () => {
    const days = Array.from({ length: 30 }, (_, i) => ({
      day: addDays(today, i - 29),
      reviews: 10,
      correct: 8,
    }));
    const res = summarize30(days, today);
    expect(res.reviews30).toBe(300);
    expect(res.correct30).toBe(240);
    expect(res.activeDays30).toBe(30);
    expect(res.retention).toBe(80);
    expect(res.perActiveDay).toBe(10);
  });

  it("ignores days outside the 30-day window", () => {
    const days = [
      { day: addDays(today, -35), reviews: 50, correct: 50 }, // outside (too old)
      { day: addDays(today, -30), reviews: 40, correct: 40 }, // outside (day -30 is 31st day ago)
      { day: addDays(today, -29), reviews: 10, correct: 8 },  // inside (oldest day of window)
      { day: today, reviews: 20, correct: 18 },               // inside (today)
      { day: addDays(today, 1), reviews: 100, correct: 100 }, // outside (future)
    ];
    const res = summarize30(days, today);
    expect(res.reviews30).toBe(30);
    expect(res.correct30).toBe(26);
    expect(res.activeDays30).toBe(2);
    expect(res.retention).toBe(Math.round((26 / 30) * 100));
  });
});
