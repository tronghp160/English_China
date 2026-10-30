"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  buddyBySpecies,
  hatchProgress,
  isBuddySpecies,
  type BuddiesData,
  type BuddySpecies,
  type BuddyView,
} from "@/lib/bin/buddies";
import { syncBuddiesData } from "@/lib/data/bin";
import { fail, ok, type ActionResult } from "./result";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { prefsSchema, readPrefs } from "@/lib/validation";

export type { BuddiesData, BuddySpecies, BuddyView };

async function saveBuddyPref(userId: string, species: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("user_settings").select("prefs").eq("user_id", userId).maybeSingle();
  const stored = prefsSchema.safeParse(data?.prefs ?? {});
  const { error } = await supabase
    .from("user_settings")
    .update({ prefs: { ...(stored.success ? stored.data : {}), bin_buddy: species } })
    .eq("user_id", userId);
  return !error;
}

/** Grants the eggs the person has earned (idempotent) and returns every buddy's state. */
export async function syncBuddies(): Promise<ActionResult<BuddiesData>> {
  const user = await requireUser();
  const data = await syncBuddiesData(user.id);
  return ok(data);
}

const hatchSchema = z.object({
  species: z.string(),
});

export async function hatchBuddy(input: unknown): Promise<ActionResult<BuddiesData>> {
  const user = await requireUser();
  const parsed = hatchSchema.safeParse(input);
  if (!parsed.success || !isBuddySpecies(parsed.data.species)) {
    return fail("Loài không hợp lệ.");
  }
  const species = parsed.data.species as BuddySpecies;

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("bin_buddies")
    .select("start_correct, hatched_at")
    .eq("user_id", user.id)
    .eq("species", species)
    .maybeSingle();

  if (!row) return fail("Chưa có trứng của bạn nhỏ này.");
  if (row.hatched_at) return fail("Bạn nhỏ này đã nở rồi.");

  const { data: stats } = await admin.from("daily_stats").select("correct").eq("user_id", user.id);
  const totalCorrect = (stats ?? []).reduce((sum, r) => sum + r.correct, 0);
  const buddyDef = buddyBySpecies(species);
  const progress = hatchProgress({
    totalCorrect,
    startCorrect: row.start_correct,
    need: buddyDef?.hatchCorrect ?? 30,
  });

  if (!progress.ready) {
    return fail("Trứng chưa sẵn sàng nở.");
  }

  const { error: updateError } = await admin
    .from("bin_buddies")
    .update({ hatched_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("species", species)
    .is("hatched_at", null);

  if (updateError) {
    return fail("Không thể ấp nở. Thử lại sau.");
  }

  const { data: settings } = await admin
    .from("user_settings")
    .select("prefs")
    .eq("user_id", user.id)
    .maybeSingle();
  const prefs = readPrefs(settings?.prefs);
  if (!prefs.bin_buddy) {
    await saveBuddyPref(user.id, species);
  }

  revalidatePath("/", "layout");
  const data = await syncBuddiesData(user.id);
  return ok(data);
}

const renameSchema = z.object({
  species: z.string(),
  name: z.string().trim().min(1, "Tên không được để trống").max(20, "Tên tối đa 20 ký tự"),
});

export async function renameBuddy(input: unknown): Promise<ActionResult<BuddiesData>> {
  const user = await requireUser();
  const parsed = renameSchema.safeParse(input);
  if (!parsed.success || !isBuddySpecies(parsed.data.species)) {
    return fail(parsed.success ? "Loài không hợp lệ." : parsed.error.issues[0]?.message ?? "Tên không hợp lệ.");
  }
  const species = parsed.data.species as BuddySpecies;

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("bin_buddies")
    .select("hatched_at")
    .eq("user_id", user.id)
    .eq("species", species)
    .maybeSingle();

  if (!row || !row.hatched_at) {
    return fail("Chỉ có thể đổi tên bạn nhỏ đã nở.");
  }

  const { error: updateError } = await admin
    .from("bin_buddies")
    .update({ name: parsed.data.name })
    .eq("user_id", user.id)
    .eq("species", species);

  if (updateError) {
    return fail("Không thể đổi tên. Thử lại sau.");
  }

  revalidatePath("/", "layout");
  const data = await syncBuddiesData(user.id);
  return ok(data);
}

const setActiveSchema = z.object({
  species: z.string().nullable().optional(),
});

export async function setActiveBuddy(
  input: unknown,
): Promise<ActionResult<{ active: BuddySpecies | null }>> {
  const user = await requireUser();
  const parsed = setActiveSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Dữ liệu không hợp lệ.");
  }

  const rawSpecies = parsed.data.species;
  if (rawSpecies && rawSpecies !== "") {
    if (!isBuddySpecies(rawSpecies)) {
      return fail("Loài không hợp lệ.");
    }
    const admin = createAdminClient();
    const { data: row } = await admin
      .from("bin_buddies")
      .select("hatched_at")
      .eq("user_id", user.id)
      .eq("species", rawSpecies)
      .maybeSingle();

    if (!row || !row.hatched_at) {
      return fail("Chưa thể chọn bạn nhỏ chưa nở.");
    }

    const saved = await saveBuddyPref(user.id, rawSpecies);
    if (!saved) return fail("Không lưu được. Thử lại sau.");
    revalidatePath("/", "layout");
    return ok({ active: rawSpecies as BuddySpecies });
  }

  const saved = await saveBuddyPref(user.id, "");
  if (!saved) return fail("Không lưu được. Thử lại sau.");
  revalidatePath("/", "layout");
  return ok({ active: null });
}
