"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMe, requireUser } from "@/lib/auth";
import { getProgress } from "@/lib/data/progress";
import { isRoomItemId, ITEM_BY_ID, lockReason, ownedItems, resolveRoom, ROOM_SLOTS, STREAK_SCARF, type RoomSlot } from "@/lib/bin/catalog";
import { OUTFITS, QUEST_BONES, QUEST_IDS, pruneClaimed, type LevelInfo, type OutfitId, type QuestId, type TrickId } from "@/lib/progress";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { prefsSchema, type Prefs } from "@/lib/validation";
import { fail, ok, type ActionResult } from "./result";
import { loadTrip, type TripView } from "./bin-trip";
import type { TripStatus } from "@/lib/bin/trip";
import { studyDay } from "@/lib/srs/streak";
import { getOrWriteGreeting } from "@/lib/ai/bin-greeting";
import type { PupMood } from "@/lib/mascot/lines";
import { buddyBySpecies, type BuddySpecies } from "@/lib/bin/buddies";

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
  longestStreak: number;
  questsDone: number;
  room: Record<RoomSlot, string>;
  owned: string[];
  trip: TripView;
  scarves: number;
  hasReadyEgg: boolean;
};

export async function loadBinHome(): Promise<ActionResult<BinHomeData>> {
  const user = await requireUser();
  const admin = createAdminClient();
  const [p, itemsRes, roomRes, tripRes, eggRes] = await Promise.all([
    getProgress(),
    admin.from("bin_items").select("item_id, qty").eq("user_id", user.id),
    admin.from("bin_room").select("slot, item_id").eq("user_id", user.id),
    loadTrip(),
    admin.from("bin_buddies").select("species, start_correct").eq("user_id", user.id).is("hatched_at", null),
  ]);
  const owned = ownedItems(itemsRes.data ?? []);
  const room = resolveRoom(roomRes.data ?? [], owned);
  const trip: TripView = tripRes.ok
    ? tripRes.data
    : { status: { kind: "locked", needReviews: 20, needQuests: 2 }, trip: null };
  const scarfRow = (itemsRes.data ?? []).find((r) => r.item_id === "streak_scarf");
  const scarves = scarfRow?.qty ?? 0;
  const hasReadyEgg = (eggRes.data ?? []).some((r) => {
    const b = buddyBySpecies(r.species as BuddySpecies);
    return b ? p.totalCorrect - r.start_correct >= b.hatchCorrect : false;
  });
  return ok({
    level: p.level,
    bones: p.bones,
    outfit: p.outfit,
    outfits: p.outfits,
    tricks: p.tricks,
    fedToday: p.fedToday,
    reviewedToday: p.reviewedToday,
    streak: p.streak,
    longestStreak: p.longestStreak,
    questsDone: p.quests.filter((q) => q.done).length,
    room,
    owned: Array.from(owned),
    trip,
    scarves,
    hasReadyEgg,
  });
}

/** What the end screen of a session needs to show what it earned (REDESIGN_V3 §9). */
export type SessionRewardData = {
  totalXp: number;
  totalCorrect: number;
  streak: number;
  /** Answers logged today, to tell whether this was the first session of the day. */
  reviewsToday: number;
  bones: number;
  quests: { id: QuestId; title: string; progress: number; target: number; done: boolean; claimed: boolean }[];
  trip: TripStatus;
};

export async function loadSessionRewards(): Promise<ActionResult<SessionRewardData>> {
  await requireUser();
  const p = await getProgress();
  return ok({
    totalXp: p.totalXp,
    totalCorrect: p.totalCorrect,
    streak: p.streak,
    reviewsToday: p.reviewsToday,
    bones: p.bones,
    quests: p.quests.map(({ id, title, progress, target, done, claimed }) => ({ id, title, progress, target, done, claimed })),
    trip: p.trip,
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
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("bin_spend", { p_user: user.id, p_kind: "feed", p_amount: 1, p_ref: null });
  if (error) return fail(error.message.includes("not_enough_bones") ? "Chưa có xương để cho ăn." : "Không lưu được. Thử lại.");
  return ok({ bones: data });
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
  const admin = createAdminClient();
  const { data: newBones, error: grantError } = await admin.rpc("bin_grant", {
    p_user: user.id,
    p_kind: "quest",
    p_amount: QUEST_BONES,
    p_ref: `${progress.today}:${id}`,
  });
  if (grantError) return fail("Không lưu được. Thử lại.");
  const saved = await savePrefs(user.id, (stored) => {
    const claimed = { ...(stored.quests_claimed ?? {}) };
    claimed[progress.today] = [...(claimed[progress.today] ?? []), id];
    return { quests_claimed: pruneClaimed(claimed), quests_total: (stored.quests_total ?? 0) + 1 };
  });
  if (!saved) return fail("Không lưu được. Thử lại.");
  return ok({ id, bones: newBones });
}

export type RoomData = {
  bones: number;
  room: Record<RoomSlot, string>;
  owned: string[];
  level: number;
  longestStreak: number;
};

export async function loadRoom(): Promise<ActionResult<RoomData>> {
  await requireUser();
  const [progress, supabase] = await Promise.all([getProgress(), createClient()]);
  const [itemsRes, roomRes] = await Promise.all([
    supabase.from("bin_items").select("item_id, qty"),
    supabase.from("bin_room").select("slot, item_id"),
  ]);
  const owned = ownedItems(itemsRes.data ?? []);
  const room = resolveRoom(roomRes.data ?? [], owned);
  return ok({
    bones: progress.bones,
    room,
    owned: Array.from(owned),
    level: progress.level.level,
    longestStreak: progress.longestStreak,
  });
}

const buyItemSchema = z.string().refine((id) => isRoomItemId(id) || id === "streak_scarf", "Vật phẩm không hợp lệ.");

export async function buyItem(input: unknown): Promise<ActionResult<{ bones: number; itemId: string }>> {
  const user = await requireUser();
  const parsed = buyItemSchema.safeParse(input);
  if (!parsed.success) return fail("Vật phẩm không hợp lệ.");
  const itemId = parsed.data;

  let price = 0;
  let maxQty = 1;

  if (itemId === "streak_scarf") {
    price = STREAK_SCARF.price;
    maxQty = STREAK_SCARF.maxQty;
  } else {
    const item = ITEM_BY_ID.get(itemId);
    if (!item || item.source.kind !== "shop") return fail("Không thể mua vật phẩm này.");
    const progress = await getProgress();
    const reason = lockReason(item, { level: progress.level.level, longestStreak: progress.longestStreak });
    if (reason) return fail(`Chưa mở khóa: ${reason}.`);
    price = item.source.price;
    maxQty = 1;
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("bin_buy", {
    p_user: user.id,
    p_item: itemId,
    p_price: price,
    p_max_qty: maxQty,
  });
  if (error) {
    if (error.message.includes("not_enough_bones")) return fail("Chưa đủ xương.");
    if (error.message.includes("already_owned")) {
      return fail(itemId === "streak_scarf" ? "Đã có đủ 2 khăn." : "Bạn đã có món này.");
    }
    return fail("Không lưu được. Thử lại.");
  }
  revalidatePath("/", "layout");
  return ok({ bones: data, itemId });
}

const placeItemSchema = z.object({
  slot: z.enum(ROOM_SLOTS as [RoomSlot, ...RoomSlot[]]),
  itemId: z.string().refine(isRoomItemId, "Vật phẩm không hợp lệ."),
});

export async function placeItem(input: unknown): Promise<ActionResult<{ slot: RoomSlot; itemId: string }>> {
  const user = await requireUser();
  const parsed = placeItemSchema.safeParse(input);
  if (!parsed.success) return fail("Vật phẩm hoặc vị trí không hợp lệ.");
  const { slot, itemId } = parsed.data;
  const item = ITEM_BY_ID.get(itemId);
  if (!item || item.slot !== slot) return fail("Vật phẩm không đúng vị trí này.");

  const admin = createAdminClient();
  const { data: itemsData } = await admin.from("bin_items").select("item_id, qty").eq("user_id", user.id);
  const owned = ownedItems(itemsData ?? []);
  if (!owned.has(itemId)) return fail("Chưa sở hữu vật phẩm này.");

  if (itemId.endsWith("_none")) {
    const { error } = await admin.from("bin_room").delete().eq("user_id", user.id).eq("slot", slot);
    if (error) return fail("Không lưu được. Thử lại.");
  } else {
    const { error } = await admin.from("bin_room").upsert(
      {
        user_id: user.id,
        slot,
        item_id: itemId,
      },
      { onConflict: "user_id,slot" },
    );
    if (error) return fail("Không lưu được. Thử lại.");
  }
  return ok({ slot, itemId });
}

export async function loadGreeting(): Promise<ActionResult<{ text: string; mood: PupMood } | null>> {
  try {
    const me = await requireMe();
    const today = studyDay(new Date(), me.settings.timezone);
    const greeting = await getOrWriteGreeting(me.user.id, today);
    return ok(greeting ? { text: greeting.text, mood: greeting.mood } : null);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Không tải được lời chào.");
  }
}
