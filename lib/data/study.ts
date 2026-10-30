import "server-only";
import { cache } from "react";
import { requireMe } from "@/lib/auth";
import type { LangCode } from "@/lib/lang/types";
import { addDays, computeStreak, planFreezes, studyDay } from "@/lib/srs/streak";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const [{ data: overview }, { data: stats }, { data: freezesRows }, { data: scarfRow }] = await Promise.all([
    supabase.rpc("today_overview"),
    supabase
      .from("daily_stats")
      .select("day, reviews, correct, xp, new_learned, words_added, goal_reached")
      .eq("user_id", me.user.id)
      .gte("day", from)
      .order("day"),
    supabase
      .from("bin_freezes")
      .select("day")
      .eq("user_id", me.user.id)
      .gte("day", from)
      .lte("day", today),
    supabase
      .from("bin_items")
      .select("qty")
      .eq("user_id", me.user.id)
      .eq("item_id", "streak_scarf")
      .maybeSingle(),
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
  const activeDays = days.filter((d) => d.reviews > 0).map((d) => d.day);

  let frozen = (freezesRows ?? []).map((r) => r.day);
  const initialScarves = scarfRow?.qty ?? 0;
  let scarves = initialScarves;
  let frozenYesterday = false;

  const plan = planFreezes(activeDays, frozen, today, scarves);
  if (plan.length > 0) {
    try {
      const admin = createAdminClient();
      const { data: usedDays, error } = await admin.rpc("bin_use_freezes", {
        p_user: me.user.id,
        p_days: plan,
      });
      if (error) {
        console.error("[bin] use_freezes error", error);
      } else if (usedDays && usedDays.length > 0) {
        frozen = [...frozen, ...usedDays];
        scarves = Math.max(0, scarves - usedDays.length);
        const yesterday = addDays(today, -1);
        frozenYesterday = usedDays.includes(yesterday);
      }
    } catch (e) {
      console.error("[bin] use_freezes exception", e);
    }
  }

  const streak = computeStreak(activeDays, today, frozen);

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
    scarves,
    frozenYesterday,
  };
});
