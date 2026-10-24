"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getProgress } from "@/lib/data/progress";
import { OUTFITS, QUEST_BONES, QUEST_IDS, pruneClaimed, type LevelInfo, type OutfitId, type QuestId, type TrickId } from "@/lib/progress";
import { createClient } from "@/lib/supabase/server";
import { prefsSchema, type Prefs } from "@/lib/validation";
import { fail, ok, type ActionResult } from "./result";

/** What "Góc của Bin" shows, read when the sheet opens (REDESIGN_V3 §5.2). */
export type BinHomeData = {
  level: LevelInfo;
  bones: number;
  outfit: OutfitId;
  outfits: OutfitId[];
  tricks: TrickId[];
  fedToday: boolean;
  reviewedToday: boolean;
  streak: number;
  questsDone: number;
};

export async function loadBinHome(): Promise<ActionResult<BinHomeData>> {
  await requireUser();
  const p = await getProgress();
  return ok({
    level: p.level,
    bones: p.bones,
    outfit: p.outfit,
    outfits: p.outfits,
    tricks: p.tricks,
    fedToday: p.fedToday,
    reviewedToday: p.reviewedToday,
    streak: p.streak,
    questsDone: p.quests.filter((q) => q.done).length,
  });
}

/** Merges a change into the stored prefs, keeping only what the person set (like updatePrefs). */
async function savePrefs(userId: string, change: (stored: Prefs) => Prefs): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("user_settings").select("prefs").eq("user_id", userId).single();
  const stored = prefsSchema.safeParse(data?.prefs ?? {});
  const { error } = await supabase
    .from("user_settings")
    .update({ prefs: { ...(stored.success ? stored.data : {}), ...change(stored.success ? stored.data : {}) } })
    .eq("user_id", userId);
  return !error;
}

/** Gives Bin one bone: needs a bone in hand (earned minus fed), counts it and remembers the day. */
export async function feedBin(): Promise<ActionResult<{ bones: number }>> {
  const user = await requireUser();
  const progress = await getProgress();
  if (progress.bones <= 0) return fail("Chưa có xương để cho ăn.");
  const saved = await savePrefs(user.id, (stored) => ({
    bin_treats_fed: (stored.bin_treats_fed ?? 0) + 1,
    bin_last_fed: progress.today,
  }));
  if (!saved) return fail("Không lưu được. Thử lại.");
  return ok({ bones: progress.bones - 1 });
}

const outfitSchema = z.string().refine((id) => OUTFITS.some((o) => o.id === id), "Trang phục không có.");

/** Saves the outfit Bin wears everywhere; only one the person has unlocked. */
export async function setBinOutfit(input: unknown): Promise<ActionResult<{ outfit: OutfitId }>> {
  const user = await requireUser();
  const parsed = outfitSchema.safeParse(input);
  if (!parsed.success) return fail("Trang phục không có.");
  const outfit = parsed.data as OutfitId;
  const progress = await getProgress();
  if (!progress.outfits.includes(outfit)) return fail("Chưa mở khóa trang phục này.");
  const saved = await savePrefs(user.id, () => ({ bin_outfit: outfit }));
  if (!saved) return fail("Không lưu được. Thử lại.");
  revalidatePath("/", "layout");
  return ok({ outfit });
}

const questSchema = z.enum(QUEST_IDS as [QuestId, ...QuestId[]]);

/**
 * Takes the reward of a daily quest (REDESIGN_V3 §6.1): the quest must be done today and not taken yet, both
 * checked here again. The day goes into `quests_claimed` (last 7 days) and the lifetime count `quests_total` goes
 * up, which is what the bones are counted from.
 */
export async function claimQuest(input: unknown): Promise<ActionResult<{ id: QuestId; bones: number }>> {
  const user = await requireUser();
  const parsed = questSchema.safeParse(input);
  if (!parsed.success) return fail("Nhiệm vụ không có.");
  const id = parsed.data;
  const progress = await getProgress();
  const quest = progress.quests.find((q) => q.id === id);
  if (!quest?.done) return fail("Chưa xong nhiệm vụ này.");
  if (quest.claimed) return fail("Đã nhận thưởng rồi.");
  const saved = await savePrefs(user.id, (stored) => {
    const claimed = { ...(stored.quests_claimed ?? {}) };
    claimed[progress.today] = [...(claimed[progress.today] ?? []), id];
    return { quests_claimed: pruneClaimed(claimed), quests_total: (stored.quests_total ?? 0) + 1 };
  });
  if (!saved) return fail("Không lưu được. Thử lại.");
  return ok({ id, bones: progress.bones + QUEST_BONES });
}
