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
  /** Days that were covered by a scarf. */
  frozenDays: string[];
  /** Oldest study day the current streak reaches; null if current === 0. */
  since: string | null;
};

/**
 * @param activeDays study days with at least one review
 * @param today current study day
 * @param frozenDays study days covered by a streak freeze (scarf)
 */
export function computeStreak(
  activeDays: Iterable<string>,
  today: string,
  frozenDays: Iterable<string> = [],
): Streak {
  const active = new Set(activeDays);
  const frozen = new Set(frozenDays);
  const activeToday = active.has(today);
  const earliest = [...active].sort()[0];
  const restWeeks = new Set<string>();
  const restDays: string[] = [];
  const frozenHit: string[] = [];
  let current = 0;
  let since: string | null = null;

  if (earliest) {
    // Today is still in progress: a missing review today never breaks the streak.
    let day = activeToday ? today : addDays(today, -1);
    const pendingRest: string[] = [];
    const pendingFrozen: string[] = [];
    while (day >= earliest) {
      if (active.has(day)) {
        current++;
        since = day;
        restDays.push(...pendingRest);
        frozenHit.push(...pendingFrozen);
        pendingRest.length = 0;
        pendingFrozen.length = 0;
      } else if (frozen.has(day)) {
        pendingFrozen.push(day); // covered by a scarf: no count, no rest day used, no break
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
    frozenDays: frozenHit.sort(),
    since: current > 0 ? since : null,
  };
}

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const head = arr[0];
  const tail = arr.slice(1);
  const withHead = combinations(tail, k - 1).map((c) => [head, ...c]);
  const withoutHead = combinations(tail, k);
  return [...withHead, ...withoutHead];
}

/**
 * Days to freeze now so the streak survives, or [] when it can't (or needn't) be saved.
 * Gap = study days strictly between the last active-or-frozen day and today.
 */
export function planFreezes(
  activeDays: Iterable<string>,
  frozenDays: Iterable<string>,
  today: string,
  scarves: number,
): string[] {
  if (scarves <= 0) return [];

  const union = new Set<string>();
  for (const d of activeDays) {
    if (d < today) union.add(d);
  }
  for (const d of frozenDays) {
    if (d < today) union.add(d);
  }
  if (union.size === 0) return [];

  const sortedUnion = [...union].sort();
  const L = sortedUnion[sortedUnion.length - 1]; // largest day < today in active ∪ frozen

  // 2. If computeStreak(active, addDays(L, 1), frozen).current === 0 (no streak before the gap) -> []
  const preStreak = computeStreak(activeDays, addDays(L, 1), frozenDays);
  if (preStreak.current === 0) return [];

  // 3. gap = study days strictly between L and today: from addDays(L, 1) to addDays(today, -1)
  const gap: string[] = [];
  let cur = addDays(L, 1);
  const gapEnd = addDays(today, -1);
  while (cur <= gapEnd) {
    gap.push(cur);
    cur = addDays(cur, 1);
  }
  if (gap.length === 0) return [];

  // 4. base = computeStreak(active, today, frozen); if weekly rest already bridges to <= L -> []
  const base = computeStreak(activeDays, today, frozenDays);
  if (base.current > 0 && base.since !== null && base.since <= L) {
    return [];
  }

  // 5. If gap.length > scarves + 2 -> []
  if (gap.length > scarves + 2) return [];

  // 6. Iterate k from 1 to min(scarves, gap.length)
  // combinations of gap sorted descending (newest first, so weekly rest covers older day)
  const gapDesc = [...gap].sort().reverse();
  const existingFrozen = [...frozenDays];
  const maxK = Math.min(scarves, gap.length);

  for (let k = 1; k <= maxK; k++) {
    const candidateCombos = combinations(gapDesc, k);
    for (const S of candidateCombos) {
      const r = computeStreak(activeDays, today, [...existingFrozen, ...S]);
      if (r.current > 0 && r.since !== null && r.since <= L) {
        return [...S].sort();
      }
    }
  }

  return [];
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
