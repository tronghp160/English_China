/**
 * Study days and streaks (docs/PLAN.md §10.1, §10.5).
 * A study day is a calendar date in the user's timezone that rolls over at
 * 04:00. A streak counts consecutive days with ≥ 1 review; one missed day per
 * week (Monday–Sunday) is a free rest day and does not break it.
 */

export const DAY_ROLLOVER_HOURS = 4;

/** "YYYY-MM-DD" study day for an instant in a timezone. */
export function studyDay(at: Date, timeZone: string): string {
  const shifted = new Date(at.getTime() - DAY_ROLLOVER_HOURS * 3_600_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(shifted);
}

function toUtc(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(day: string, n: number): string {
  return fromUtc(toUtc(day) + n * 86_400_000);
}

/** Monday of the week containing `day`. */
export function weekStart(day: string): string {
  const dow = new Date(toUtc(day)).getUTCDay(); // 0 = Sunday
  return addDays(day, -((dow + 6) % 7));
}

export type Streak = {
  current: number;
  /** Today already has a review. */
  activeToday: boolean;
  /** The free rest day of the current week was used to keep the streak. */
  restUsedThisWeek: boolean;
  /** Days that were covered by a rest day (for the heatmap). */
  restDays: string[];
};

/**
 * @param activeDays study days with at least one review
 * @param today current study day
 */
export function computeStreak(activeDays: Iterable<string>, today: string): Streak {
  const active = new Set(activeDays);
  const activeToday = active.has(today);
  const earliest = [...active].sort()[0];
  const restWeeks = new Set<string>();
  const restDays: string[] = [];
  let current = 0;

  if (earliest) {
    // Today is still in progress: a missing review today never breaks the streak.
    let day = activeToday ? today : addDays(today, -1);
    const pendingRest: string[] = [];
    while (day >= earliest) {
      if (active.has(day)) {
        current++;
        restDays.push(...pendingRest);
        pendingRest.length = 0;
      } else {
        const week = weekStart(day);
        if (restWeeks.has(week)) break;
        restWeeks.add(week);
        pendingRest.push(day);
      }
      day = addDays(day, -1);
    }
    // A rest day only counts if an active day exists before it.
    for (const d of pendingRest) restWeeks.delete(weekStart(d));
  }

  return {
    current,
    activeToday,
    restUsedThisWeek: restWeeks.has(weekStart(today)) && current > 0,
    restDays,
  };
}

/**
 * The longest run of consecutive study days in the history (no rest days counted). Used for the outfits that
 * unlock by streak: a streak that was reached once keeps the reward even after it broke.
 */
export function longestStreak(activeDays: Iterable<string>): number {
  const days = [...new Set(activeDays)].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of days) {
    run = prev && addDays(prev, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}
