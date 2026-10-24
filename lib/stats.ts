import { addDays } from "@/lib/srs/streak";

export type DayStat = {
  day: string;
  reviews: number;
  correct?: number;
};

export type DaySummary = {
  day: string;
  reviews: number;
  correct: number;
};

export type Summary30 = {
  last30: DaySummary[];
  reviews30: number;
  correct30: number;
  activeDays30: number;
  retention: number | null;
  best: DaySummary;
  perActiveDay: number;
};

/**
 * Computes 30-day review statistics ending on `today` (inclusive).
 */
export function summarize30(
  days: readonly DayStat[],
  today: string,
): Summary30 {
  const byDay = new Map(days.map((d) => [d.day, d]));
  const last30: DaySummary[] = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29)).map((day) => ({
    day,
    reviews: byDay.get(day)?.reviews ?? 0,
    correct: byDay.get(day)?.correct ?? 0,
  }));
  const reviews30 = last30.reduce((n, d) => n + d.reviews, 0);
  const correct30 = last30.reduce((n, d) => n + d.correct, 0);
  const activeDays30 = last30.filter((d) => d.reviews > 0).length;
  const retention = reviews30 ? Math.round((correct30 / reviews30) * 100) : null;
  const best = last30.reduce((a, b) => (b.reviews > a.reviews ? b : a), last30[0]);
  const perActiveDay = activeDays30 ? Math.round(reviews30 / activeDays30) : 0;

  return {
    last30,
    reviews30,
    correct30,
    activeDays30,
    retention,
    best,
    perActiveDay,
  };
}
