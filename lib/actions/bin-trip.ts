"use server";

import { z } from "zod";
import { tripWordCandidates } from "@/lib/data/bin";
import { getProgress } from "@/lib/data/progress";
import { ownedItems } from "@/lib/bin/catalog";
import { pickPlace, placeById } from "@/lib/bin/places";
import {
  isOvernight,
  pickWord,
  rngFrom,
  templateStory,
  tripReturnTime,
  tripReward,
  tripStatus,
  type BinStory,
  type TripStatus,
} from "@/lib/bin/trip";
import { seedOf } from "@/lib/mascot/lines";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";
import { readPrefs } from "@/lib/validation";
import type { LangCode } from "@/lib/lang/types";
import { fail, ok, type ActionResult } from "./result";

export type TripView = {
  status: TripStatus;
  trip: null | {
    id: string;
    placeId: string;
    lang: LangCode;
    returnsAt: string;
    overnight: boolean;
    word: { id: string | null; term: string; meaningVi: string | null } | null;
    story: BinStory | null;
    bones: number;
    itemId: string | null;
    collected: boolean;
  };
};

export async function loadTrip(): Promise<ActionResult<TripView>> {
  const user = await requireUser();
  const [progress, admin] = await Promise.all([getProgress(), createAdminClient()]);
  const { data: settings } = await admin
    .from("user_settings")
    .select("timezone, prefs")
    .eq("user_id", user.id)
    .maybeSingle();
  const timezone = settings?.timezone ?? "Asia/Ho_Chi_Minh";

  const { data: latestRows } = await admin
    .from("bin_trips")
    .select("*")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(1);
  const latest = latestRows?.[0] ?? null;

  const now = new Date();
  const status = tripStatus({
    today: progress.today,
    reviewsToday: progress.reviewsToday,
    questsDone: progress.quests.filter((q) => q.done).length,
    now,
    latest: latest
      ? {
          id: latest.id,
          study_day: latest.study_day,
          place_id: latest.place_id,
          returns_at: latest.returns_at,
          collected_at: latest.collected_at,
        }
      : null,
  });

  const trip = latest
    ? {
        id: latest.id,
        placeId: latest.place_id,
        lang: latest.lang as LangCode,
        returnsAt: latest.returns_at,
        overnight: isOvernight(new Date(latest.started_at), timezone),
        word: latest.word_term
          ? {
              id: latest.word_id,
              term: latest.word_term,
              meaningVi: null,
            }
          : null,
        story: (latest.story as unknown as BinStory) ?? null,
        bones: latest.bones,
        itemId: latest.item_id,
        collected: latest.collected_at !== null,
      }
    : null;

  return ok({ status, trip });
}

export async function startTrip(): Promise<ActionResult<TripView>> {
  const user = await requireUser();
  const [progress, admin] = await Promise.all([getProgress(), createAdminClient()]);
  const { data: settings } = await admin
    .from("user_settings")
    .select("timezone, prefs, study_langs")
    .eq("user_id", user.id)
    .maybeSingle();
  const timezone = settings?.timezone ?? "Asia/Ho_Chi_Minh";
  const studyLangs = (settings?.study_langs as LangCode[]) ?? ["en"];

  const { data: latestRows } = await admin
    .from("bin_trips")
    .select("*")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(1);
  const latest = latestRows?.[0] ?? null;

  const now = new Date();
  const status = tripStatus({
    today: progress.today,
    reviewsToday: progress.reviewsToday,
    questsDone: progress.quests.filter((q) => q.done).length,
    now,
    latest: latest
      ? {
          id: latest.id,
          study_day: latest.study_day,
          place_id: latest.place_id,
          returns_at: latest.returns_at,
          collected_at: latest.collected_at,
        }
      : null,
  });

  if (status.kind !== "ready") {
    return fail("Bin chưa đi được lúc này.");
  }

  const candidates = await tripWordCandidates(user.id);
  const seed = seedOf(user.id + progress.today);
  const rng = rngFrom(seed);
  const pickedWord = pickWord(candidates, rng);
  const lang: LangCode = pickedWord ? pickedWord.language : (studyLangs[0] ?? "en");

  const { data: visitedRows } = await admin.from("bin_trips").select("place_id").eq("user_id", user.id);
  const visited = new Set((visitedRows ?? []).map((r) => r.place_id));
  const place = pickPlace(lang, visited, rng);

  const { data: itemRows } = await admin.from("bin_items").select("item_id, qty").eq("user_id", user.id);
  const owned = ownedItems(itemRows ?? []);

  const { count: tripCount } = await admin
    .from("bin_trips")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  const tripNumber = (tripCount ?? 0) + 1;

  const reward = tripReward({ lang, owned, tripNumber, rng });
  const returnsAt = tripReturnTime(now, timezone);

  const { data: inserted, error: insertError } = await admin
    .from("bin_trips")
    .insert({
      user_id: user.id,
      study_day: progress.today,
      lang,
      place_id: place.id,
      word_id: pickedWord?.id ?? null,
      word_term: pickedWord?.term ?? null,
      bones: reward.bones,
      item_id: reward.itemId,
      started_at: now.toISOString(),
      returns_at: returnsAt.toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === "23505") return fail("Hôm nay Bin đã đi dạo rồi.");
    return fail("Không thể bắt đầu chuyến đi. Thử lại sau.");
  }

  const trip = {
    id: inserted.id,
    placeId: inserted.place_id,
    lang: inserted.lang as LangCode,
    returnsAt: inserted.returns_at,
    overnight: isOvernight(now, timezone),
    word: inserted.word_term
      ? {
          id: inserted.word_id,
          term: inserted.word_term,
          meaningVi: pickedWord?.meaning_vi ?? null,
        }
      : null,
    story: null,
    bones: inserted.bones,
    itemId: inserted.item_id,
    collected: false,
  };

  return ok({
    status: {
      kind: "away",
      tripId: inserted.id,
      placeId: inserted.place_id,
      returnsAt: inserted.returns_at,
    },
    trip,
  });
}

const collectSchema = z.object({
  tripId: z.string().uuid("Chuyến đi không hợp lệ."),
});

export async function collectTrip(input: unknown): Promise<ActionResult<{ bones: number; view: TripView }>> {
  const user = await requireUser();
  const parsed = collectSchema.safeParse(input);
  if (!parsed.success) return fail("Chuyến đi không hợp lệ.");
  const { tripId } = parsed.data;

  const admin = createAdminClient();
  const { data: newBalance, error } = await admin.rpc("bin_collect_trip", {
    p_user: user.id,
    p_trip: tripId,
  });

  if (error) {
    if (error.message.includes("not_back")) return fail("Bin chưa về đâu.");
    if (error.message.includes("no_trip")) return fail("Không tìm thấy chuyến đi.");
    if (error.message.includes("already_collected")) {
      const current = await loadTrip();
      if (!current.ok) return fail(current.error);
      const { data: userBal } = await admin.rpc("bin_balance", { p_user: user.id });
      return ok({ bones: userBal ?? 0, view: current.data });
    }
    return fail("Không thể đón Bin. Thử lại sau.");
  }

  // If story is null, generate templateStory and save it to bin_trips
  const { data: tripRow } = await admin.from("bin_trips").select("*").eq("id", tripId).single();
  if (tripRow && tripRow.story === null) {
    const { data: settings } = await admin.from("user_settings").select("prefs").eq("user_id", user.id).maybeSingle();
    const prefs = readPrefs(settings?.prefs);
    const place = placeById(tripRow.place_id);
    const fallback = templateStory({
      lang: tripRow.lang as LangCode,
      placeName: place?.name ?? tripRow.place_id,
      landmark: place?.landmark ?? "",
      term: tripRow.word_term,
      meaningVi: null,
      name: prefs.mascot_name,
      seed: seedOf(tripId),
    });
    await admin.from("bin_trips").update({ story: fallback }).eq("id", tripId);
  }

  const updatedView = await loadTrip();
  if (!updatedView.ok) return fail(updatedView.error);

  return ok({ bones: newBalance ?? 0, view: updatedView.data });
}

export async function loadPostcards(): Promise<
  ActionResult<{ placeId: string; lang: LangCode; day: string; tripId: string; word: string | null }[]>
> {
  const user = await requireUser();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bin_trips")
    .select("place_id, lang, study_day, id, word_term")
    .eq("user_id", user.id)
    .not("collected_at", "is", null)
    .order("collected_at", { ascending: false });

  if (error || !data) return ok([]);

  return ok(
    data.map((r) => ({
      placeId: r.place_id,
      lang: r.lang as LangCode,
      day: r.study_day,
      tripId: r.id,
      word: r.word_term,
    })),
  );
}
