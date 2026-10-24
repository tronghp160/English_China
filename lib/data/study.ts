import "server-only";
import { cache } from "react";
import { requireMe } from "@/lib/auth";
import type { LangCode } from "@/lib/lang/types";
import { addDays, computeStreak, studyDay } from "@/lib/srs/streak";
import { createClient } from "@/lib/supabase/server";

export type LangOverview = {
  language: LangCode;
  due: number;
  newToday: number;
  dueTomorrow: number;
  total: number;
};

/** Today's counts, streak and recent daily stats for the signed-in user. */
export const getStudySummary = cache(async () => {
  const me = await requireMe();
  const supabase = await createClient();
  await supabase.rpc("ensure_user_cards", {});
  const today = studyDay(new Date(), me.settings.timezone);
  const from = addDays(today, -400);
  const [{ data: overview }, { data: stats }] = await Promise.all([
    supabase.rpc("today_overview"),
    supabase
      .from("daily_stats")
      .select("day, reviews, correct, xp, new_learned, words_added, goal_reached")
      .eq("user_id", me.user.id)
      .gte("day", from)
      .order("day"),
  ]);

  const rows = overview ?? [];
  const newLeft = rows[0]?.new_left ?? me.settings.daily_new_limit;
  const reviewsLeft = rows[0]?.reviews_left ?? me.settings.daily_review_limit;
  let budget = newLeft;
  const langs: LangOverview[] = rows
    .map((r) => ({
      language: r.language,
      due: Math.min(Number(r.due_count), reviewsLeft),
      newAvailable: Number(r.new_available),
      dueTomorrow: Number(r.due_tomorrow),
      total: Number(r.total_cards),
    }))
    .sort((a, b) => a.language.localeCompare(b.language))
    .map(({ newAvailable, ...r }) => {
      // the daily new-card limit is shared across languages
      const newToday = Math.min(newAvailable, budget);
      budget -= newToday;
      return { ...r, newToday };
    });

  const days = stats ?? [];
  const todayStats = days.find((d) => d.day === today);
  const streak = computeStreak(
    days.filter((d) => d.reviews > 0).map((d) => d.day),
    today,
  );

  return {
    me,
    today,
    langs,
    days,
    streak,
    goal: me.settings.daily_goal,
    reviewedToday: todayStats?.reviews ?? 0,
    correctToday: todayStats?.correct ?? 0,
    xpToday: todayStats?.xp ?? 0,
    totalCards: langs.reduce((n, l) => n + l.total, 0),
  };
});
