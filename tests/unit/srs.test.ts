import { describe, expect, it } from "vitest";
import { formatInterval } from "@/lib/format";
import { emptyDbCard, fromFsrs, previewDue, schedule, toFsrs, type DbCard } from "@/lib/srs/fsrs";
import {
  answer,
  buildQueue,
  LEARN_AHEAD_MS,
  peek,
  remaining,
  type QueueItem,
} from "@/lib/srs/queue";
import { addDays, computeStreak, studyDay, weekStart } from "@/lib/srs/streak";

const NOW = new Date("2026-10-16T08:00:00Z");

function card(over: Partial<DbCard> = {}): DbCard {
  return { ...emptyDbCard(NOW), ...over };
}

describe("fsrs adapter", () => {
  it("round-trips a card", () => {
    const c = card({
      state: "review",
      stability: 3.2,
      difficulty: 5,
      reps: 4,
      lapses: 1,
      last_review: NOW.toISOString(),
    });
    expect(fromFsrs(toFsrs(c))).toEqual(c);
  });

  it("schedules a new card: Again stays in minutes, Easy goes to days", () => {
    const c = card();
    const again = schedule(c, 1, NOW);
    const easy = schedule(c, 4, NOW);
    expect(again.state).toBe("learning");
    expect(Date.parse(again.due) - NOW.getTime()).toBeLessThan(10 * 60_000);
    expect(easy.state).toBe("review");
    expect(Date.parse(easy.due) - NOW.getTime()).toBeGreaterThanOrEqual(86_400_000);
    expect(easy.reps).toBe(1);
    expect(easy.last_review).toBe(NOW.toISOString());
  });

  it("is deterministic for the same card and time (client preview = server)", () => {
    const c = card({
      state: "review",
      stability: 10,
      difficulty: 5,
      reps: 5,
      scheduled_days: 10,
      last_review: "2026-10-06T08:00:00Z",
      due: "2026-10-16T08:00:00Z",
    });
    expect(schedule(c, 3, NOW)).toEqual(schedule(c, 3, NOW));
    expect(previewDue(c, NOW)[3].toISOString()).toBe(schedule(c, 3, NOW).due);
  });

  it("orders preview intervals Again ≤ Hard ≤ Good ≤ Easy", () => {
    const c = card({
      state: "review",
      stability: 10,
      difficulty: 5,
      reps: 5,
      scheduled_days: 10,
      last_review: "2026-10-06T08:00:00Z",
      due: "2026-10-16T08:00:00Z",
    });
    const p = previewDue(c, NOW);
    expect(p[1].getTime()).toBeLessThanOrEqual(p[2].getTime());
    expect(p[2].getTime()).toBeLessThanOrEqual(p[3].getTime());
    expect(p[3].getTime()).toBeLessThanOrEqual(p[4].getTime());
  });

  it("a lapse counts and relearns", () => {
    const c = card({
      state: "review",
      stability: 10,
      difficulty: 5,
      reps: 5,
      scheduled_days: 10,
      last_review: "2026-10-06T08:00:00Z",
      due: "2026-10-16T08:00:00Z",
    });
    const next = schedule(c, 1, NOW);
    expect(next.lapses).toBe(1);
    expect(next.state).toBe("relearning");
  });
});

describe("formatInterval", () => {
  it.each([
    [30_000, "1 phút"],
    [10 * 60_000, "10 phút"],
    [3 * 3_600_000, "3 giờ"],
    [2 * 86_400_000, "2 ngày"],
    [60 * 86_400_000, "2 tháng"],
    [547 * 86_400_000, "1,5 năm"],
  ])("%d ms -> %s", (ms, label) => expect(formatInterval(ms)).toBe(label));
});

type Item = QueueItem & { term: string };
const item = (term: string, isNew: boolean, due: string): Item => ({
  key: term,
  term,
  isNew,
  card: card({ state: isNew ? "new" : "review", due }),
});

describe("review queue", () => {
  it("orders overdue (oldest first), then new cards in given order", () => {
    const q = buildQueue([
      item("new1", true, "2026-10-16T00:00:00Z"),
      item("due-late", false, "2026-10-16T07:00:00Z"),
      item("new2", true, "2026-10-16T00:00:00Z"),
      item("due-old", false, "2026-10-10T00:00:00Z"),
    ]);
    expect(q.pending.map((i) => i.term)).toEqual(["due-old", "due-late", "new1", "new2"]);
  });

  it("puts a forgotten card at the end of the queue", () => {
    let q = buildQueue([
      item("a", false, "2026-10-15T00:00:00Z"),
      item("b", false, "2026-10-15T01:00:00Z"),
    ]);
    const a = peek(q, NOW)!;
    q = answer(q, a, { ...a, card: schedule(a.card, 1, NOW) }, true, NOW);
    expect(q.pending.map((i) => i.term)).toEqual(["b", "a"]);
    expect(remaining(q)).toBe(2);
  });

  it("brings a learning card back when due, before pending cards", () => {
    let q = buildQueue([
      item("a", true, NOW.toISOString()),
      item("b", true, NOW.toISOString()),
      item("c", true, NOW.toISOString()),
    ]);
    const a = peek(q, NOW)!;
    const learned = {
      ...a,
      card: card({ state: "learning", due: new Date(NOW.getTime() + 5 * 60_000).toISOString() }),
    };
    q = answer(q, a, learned, false, NOW);
    expect(peek(q, NOW)!.term).toBe("b");
    const later = new Date(NOW.getTime() + 6 * 60_000);
    expect(peek(q, later)!.term).toBe("a");
    expect(peek(q, later)!.isNew).toBe(false);
  });

  it("learns ahead when nothing else is left, and drops cards due later", () => {
    let q = buildQueue([item("a", true, NOW.toISOString()), item("b", true, NOW.toISOString())]);
    const a = peek(q, NOW)!;
    q = answer(
      q,
      a,
      {
        ...a,
        card: card({ state: "learning", due: new Date(NOW.getTime() + 10 * 60_000).toISOString() }),
      },
      false,
      NOW,
    );
    const b = peek(q, NOW)!;
    q = answer(
      q,
      b,
      {
        ...b,
        card: card({
          state: "review",
          due: new Date(NOW.getTime() + LEARN_AHEAD_MS + 1).toISOString(),
        }),
      },
      false,
      NOW,
    );
    expect(peek(q, NOW)!.term).toBe("a");
    const a2 = peek(q, NOW)!;
    q = answer(
      q,
      a2,
      { ...a2, card: card({ state: "review", due: "2026-10-20T00:00:00Z" }) },
      false,
      NOW,
    );
    expect(peek(q, NOW)).toBeNull();
    expect(remaining(q)).toBe(0);
  });
});

describe("study day", () => {
  it("rolls over at 04:00 in the user's timezone", () => {
    // 03:30 Vietnam time on the 17th is still the 16th
    expect(studyDay(new Date("2026-10-16T20:30:00Z"), "Asia/Ho_Chi_Minh")).toBe("2026-10-16");
    // 04:30 Vietnam time on the 17th
    expect(studyDay(new Date("2026-10-16T21:30:00Z"), "Asia/Ho_Chi_Minh")).toBe("2026-10-17");
  });

  it("weeks start on Monday", () => {
    expect(weekStart("2026-10-16")).toBe("2026-10-12"); // Friday
    expect(weekStart("2026-10-12")).toBe("2026-10-12");
    expect(weekStart("2026-10-18")).toBe("2026-10-12"); // Sunday
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });
});

describe("streak", () => {
  const days = (from: string, n: number) => Array.from({ length: n }, (_, i) => addDays(from, i));

  it("counts consecutive days ending today", () => {
    expect(computeStreak(days("2026-10-12", 5), "2026-10-16")).toMatchObject({
      current: 5,
      activeToday: true,
    });
  });

  it("does not break before today ends", () => {
    expect(computeStreak(days("2026-10-12", 4), "2026-10-16")).toMatchObject({
      current: 4,
      activeToday: false,
    });
  });

  it("one missed day per week is a free rest day", () => {
    // Mon..Fri with Wednesday missing
    const s = computeStreak(["2026-10-12", "2026-10-13", "2026-10-15", "2026-10-16"], "2026-10-16");
    expect(s.current).toBe(4);
    expect(s.restUsedThisWeek).toBe(true);
    expect(s.restDays).toEqual(["2026-10-14"]);
  });

  it("a second missed day in the same week breaks the streak", () => {
    const s = computeStreak(["2026-10-12", "2026-10-15", "2026-10-16"], "2026-10-16");
    expect(s.current).toBe(2);
  });

  it("rest days in different weeks both count", () => {
    // Sun 11 missed (week of Oct 5), Wed 14 missed (week of Oct 12)
    const s = computeStreak(
      ["2026-10-09", "2026-10-10", "2026-10-12", "2026-10-13", "2026-10-15"],
      "2026-10-15",
    );
    expect(s.current).toBe(5);
    expect(s.restDays.sort()).toEqual(["2026-10-11", "2026-10-14"]);
  });

  it("is zero without any review", () => {
    expect(computeStreak([], "2026-10-16")).toMatchObject({ current: 0, restUsedThisWeek: false });
    expect(computeStreak(["2026-10-01"], "2026-10-16").current).toBe(0);
  });
});
