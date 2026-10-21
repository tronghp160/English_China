"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  onboardingSchema,
  prefsSchema,
  settingsSchema,
  type OnboardingInput,
  type Prefs,
  type SettingsInput,
} from "@/lib/validation";
import { fail, ok, zodFieldErrors, type ActionResult } from "./result";

const DEFAULT_DECK_NAMES = {
  en: "Từ vựng tiếng Anh của tôi",
  zh: "Từ vựng tiếng Trung của tôi",
} as const;

function isUniqueViolation(error: { code?: string } | null) {
  return error?.code === "23505";
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username.trim().toLowerCase())
    .maybeSingle();
  return !data || data.id === user.id;
}

export async function completeOnboarding(input: OnboardingInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return fail("Kiểm tra lại thông tin.", zodFieldErrors(parsed.error.issues));
  const v = parsed.data;
  const supabase = await createClient();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ display_name: v.display_name, username: v.username })
    .eq("id", user.id);
  if (isUniqueViolation(profileError)) {
    return fail("Tên người dùng đã có người dùng.", { username: "Tên này đã có người dùng, chọn tên khác" });
  }
  if (profileError) return fail("Không lưu được hồ sơ. Thử lại.");

  const { error: settingsError } = await supabase
    .from("user_settings")
    .update({ study_langs: v.study_langs, daily_new_limit: v.daily_new_limit, onboarded: true })
    .eq("user_id", user.id);
  if (settingsError) return fail("Không lưu được cài đặt. Thử lại.");

  // One empty deck per chosen language, unless the user already has decks.
  const { count } = await supabase
    .from("decks")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);
  if (!count) {
    await supabase.from("decks").insert(
      v.study_langs.map((language) => ({
        owner_id: user.id,
        name: DEFAULT_DECK_NAMES[language],
        language,
      })),
    );
  }

  revalidatePath("/", "layout");
  return ok();
}

export async function updateSettings(input: SettingsInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return fail("Kiểm tra lại thông tin.", zodFieldErrors(parsed.error.issues));
  const v = parsed.data;
  const supabase = await createClient();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ display_name: v.display_name, username: v.username })
    .eq("id", user.id);
  if (isUniqueViolation(profileError)) {
    return fail("Tên người dùng đã có người dùng.", { username: "Tên này đã có người dùng, chọn tên khác" });
  }
  if (profileError) return fail("Không lưu được hồ sơ. Thử lại.");

  const { error } = await supabase
    .from("user_settings")
    .update({ daily_new_limit: v.daily_new_limit, daily_goal: v.daily_goal, study_langs: v.study_langs })
    .eq("user_id", user.id);
  if (error) return fail("Không lưu được cài đặt. Thử lại.");

  revalidatePath("/", "layout");
  return ok();
}

/** Merge UI preferences (voices, tts rate, toggles). */
export async function updatePrefs(patch: Prefs): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = prefsSchema.safeParse(patch);
  if (!parsed.success) return fail("Cài đặt không hợp lệ.");
  const supabase = await createClient();
  const { data } = await supabase.from("user_settings").select("prefs").eq("user_id", user.id).single();
  // Store only what the user set, so changing a default later reaches them too.
  const stored = prefsSchema.safeParse(data?.prefs ?? {});
  const merged = { ...(stored.success ? stored.data : {}), ...parsed.data };
  const { error } = await supabase.from("user_settings").update({ prefs: merged }).eq("user_id", user.id);
  if (error) return fail("Không lưu được cài đặt. Thử lại.");
  revalidatePath("/", "layout");
  return ok();
}

export async function updateAvatar(avatarUrl: string | null): Promise<ActionResult> {
  const user = await requireUser();
  if (avatarUrl && !/^https:\/\//.test(avatarUrl)) return fail("Ảnh không hợp lệ.");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);
  if (error) return fail("Không lưu được ảnh đại diện.");
  revalidatePath("/", "layout");
  return ok();
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
