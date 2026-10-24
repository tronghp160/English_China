import "server-only";
import { cache } from "react";
import { getStudySummary } from "@/lib/data/study";
import {
  bonesAvailable,
  claimedOn,
  dailyQuests,
  levelFromXp,
  unlockedOutfits,
  unlockedTricks,
  type LevelInfo,
  type OutfitId,
  type Quest,
  type QuestId,
  type TrickId,
} from "@/lib/progress";
import { longestStreak } from "@/lib/srs/streak";
import { createClient } from "@/lib/supabase/server";
import { readPrefs } from "@/lib/validation";

export type Progress = {
  /** Study day (YYYY-MM-DD) the numbers are for. */
  today: string;
  level: LevelInfo;
  totalXp: number;
  totalCorrect: number;
  longestStreak: number;
  /** Current streak in days. */
  streak: number;
  reviewedToday: boolean;
  quests: (Quest & { claimed: boolean })[];
  /** Quests that are done and whose reward is still waiting. */
  unclaimed: QuestId[];
  /** Bones in hand (earned minus fed). */
  bones: number;
  fedToday: boolean;
  outfit: OutfitId;
  outfits: OutfitId[];
  tricks: TrickId[];
};

/**
 * Everything the game layer shows about the signed-in person (level, quests, bones, unlocks), read through
 * the RLS client from `daily_stats` and the prefs. One row per study day, so summing in TS stays cheap.
 */
export const getProgress = cache(async (): Promise<Progress> => {
  const summary = await getStudySummary();
  const { me, today, streak } = summary;
  const supabase = await createClient();
  const { data } = await supabase.from("daily_stats").select("day, reviews, correct, new_learned, xp").eq("user_id", me.user.id);
  const rows = data ?? [];

  const totalXp = rows.reduce((n, r) => n + r.xp, 0);
  const totalCorrect = rows.reduce((n, r) => n + r.correct, 0);
  const longest = Math.max(
    longestStreak(rows.filter((r) => r.reviews > 0).map((r) => r.day)),
    streak.current,
  );
  const todayRow = rows.find((r) => r.day === today);
  const dueLeft = summary.langs.reduce((n, l) => n + l.due, 0);

  const prefs = readPrefs(me.settings.prefs);
  const taken = claimedOn(prefs.quests_claimed, today);
  const quests = dailyQuests({
    reviews: todayRow?.reviews ?? 0,
    correct: todayRow?.correct ?? 0,
    new_learned: todayRow?.new_learned ?? 0,
    dueLeft,
  }).map((q) => ({ ...q, claimed: taken.includes(q.id) }));

  const level = levelFromXp(totalXp);
  return {
    today,
    level,
    totalXp,
    totalCorrect,
    longestStreak: longest,
    streak: streak.current,
    reviewedToday: (todayRow?.reviews ?? 0) > 0,
    quests,
    unclaimed: quests.filter((q) => q.done && !q.claimed).map((q) => q.id),
    bones: bonesAvailable({ totalCorrect, questsClaimedTotal: prefs.quests_total, treatsFed: prefs.bin_treats_fed }),
    fedToday: prefs.bin_last_fed === today,
    outfit: (unlockedOutfits({ longestStreak: longest, level: level.level }) as string[]).includes(prefs.bin_outfit)
      ? (prefs.bin_outfit as OutfitId)
      : "none",
    outfits: unlockedOutfits({ longestStreak: longest, level: level.level }),
    tricks: unlockedTricks(level.level),
  };
});
