import { describe, expect, it } from "vitest";
import { addDays, computeStreak, planFreezes } from "@/lib/srs/streak";

function range(start: string, end: string): string[] {
  const res: string[] = [];
  let cur = start;
  while (cur <= end) {
    res.push(cur);
    cur = addDays(cur, 1);
  }
  return res;
}

describe("streak freeze and planFreezes", () => {
  // Calendar context 2026:
  // 2026-11-02 is Monday
  // 2026-11-03 is Tuesday
  // 2026-11-04 is Wednesday
  // 2026-11-05 is Thursday

  it("Ca A: missed yesterday, weekly rest covers it -> plan is empty, streak continues", () => {
    const active = range("2026-10-28", "2026-11-02");
    const frozen: string[] = [];
    const scarves = 1;
    const today = "2026-11-04";

    const plan = planFreezes(active, frozen, today, scarves);
    expect(plan).toEqual([]);

    const streak = computeStreak(active, today, frozen);
    expect(streak.current).toBe(6);
    expect(streak.restDays).toEqual(["2026-11-03"]);
  });

  it("Ca B: missed Mon & Tue of same week, 1 scarf -> freezes Tue, Mon is rest day", () => {
    const active = range("2026-10-29", "2026-11-01");
    const frozen: string[] = [];
    const scarves = 1;
    const today = "2026-11-04";

    const plan = planFreezes(active, frozen, today, scarves);
    expect(plan).toEqual(["2026-11-03"]);

    const streak = computeStreak(active, today, plan);
    expect(streak.current).toBe(4);
    expect(streak.restDays).toEqual(["2026-11-02"]);
    expect(streak.frozenDays).toEqual(["2026-11-03"]);
  });

  it("Ca B0: missed Mon & Tue with 0 scarves -> cannot be saved", () => {
    const active = range("2026-10-29", "2026-11-01");
    const frozen: string[] = [];
    const scarves = 0;
    const today = "2026-11-04";

    const plan = planFreezes(active, frozen, today, scarves);
    expect(plan).toEqual([]);

    const streak = computeStreak(active, today, frozen);
    expect(streak.current).toBe(0);
    expect(streak.restDays).toEqual([]);
  });

  it("Ca C: missed Mon, Tue, Wed with 1 scarf -> cannot bridge 3 days in 1 week", () => {
    const active = range("2026-10-29", "2026-11-01");
    const frozen: string[] = [];
    const scarves = 1;
    const today = "2026-11-05";

    const plan = planFreezes(active, frozen, today, scarves);
    expect(plan).toEqual([]);

    const streak = computeStreak(active, today, frozen);
    expect(streak.current).toBe(0);
  });

  it("Ca C2: missed Mon, Tue, Wed with 2 scarves -> freezes Tue & Wed, Mon is rest day", () => {
    const active = range("2026-10-29", "2026-11-01");
    const frozen: string[] = [];
    const scarves = 2;
    const today = "2026-11-05";

    const plan = planFreezes(active, frozen, today, scarves);
    expect(plan).toEqual(["2026-11-03", "2026-11-04"]);

    const streak = computeStreak(active, today, plan);
    expect(streak.current).toBe(4);
    expect(streak.restDays).toEqual(["2026-11-02"]);
    expect(streak.frozenDays).toEqual(["2026-11-03", "2026-11-04"]);
  });

  it("Ca D: no recent streak -> plan is empty", () => {
    const active = ["2026-10-20"];
    const frozen: string[] = [];
    const scarves = 2;
    const today = "2026-11-04";

    const plan = planFreezes(active, frozen, today, scarves);
    expect(plan).toEqual([]);

    const streak = computeStreak(active, today, frozen);
    expect(streak.current).toBe(0);
  });

  it("Ca E: already frozen previously (second app open) -> plan is empty, streak kept", () => {
    const active = range("2026-10-29", "2026-11-01");
    const frozen = ["2026-11-03"];
    const scarves = 1;
    const today = "2026-11-04";

    const plan = planFreezes(active, frozen, today, scarves);
    expect(plan).toEqual([]);

    const streak = computeStreak(active, today, frozen);
    expect(streak.current).toBe(4);
    expect(streak.restDays).toEqual(["2026-11-02"]);
    expect(streak.frozenDays).toEqual(["2026-11-03"]);
  });

  it("Ca F: already studied today after a 2-day gap -> plan freezes Tue, streak extends with today", () => {
    const active = [...range("2026-10-29", "2026-11-01"), "2026-11-04"];
    const frozen: string[] = [];
    const scarves = 1;
    const today = "2026-11-04";

    const plan = planFreezes(active, frozen, today, scarves);
    expect(plan).toEqual(["2026-11-03"]);

    const streak = computeStreak(active, today, plan);
    expect(streak.current).toBe(5);
    expect(streak.restDays).toEqual(["2026-11-02"]);
    expect(streak.frozenDays).toEqual(["2026-11-03"]);
    expect(streak.activeToday).toBe(true);
  });

  it("returns frozenDays sorted ascending, only counting frozen days in current streak", () => {
    // Current streak: active 11-04, frozen 11-03, rest 11-02, active 11-01
    // Old disconnected frozen day 10-10 should NOT be in frozenDays of streak
    const active = ["2026-11-01", "2026-11-04"];
    const frozen = ["2026-10-10", "2026-11-03"];
    const streak = computeStreak(active, "2026-11-04", frozen);
    expect(streak.frozenDays).toEqual(["2026-11-03"]);
    expect(streak.since).toBe("2026-11-01");
  });

  it("sets since to null when current streak is 0", () => {
    const streak = computeStreak([], "2026-11-04");
    expect(streak.current).toBe(0);
    expect(streak.since).toBeNull();
    expect(streak.frozenDays).toEqual([]);
  });
});
