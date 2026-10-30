import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, "3–20 ký tự: chữ thường không dấu, số hoặc dấu gạch dưới");

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Nhập tên hiển thị")
  .max(50, "Tối đa 50 ký tự");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email quá dài")
  .email("Email chưa đúng định dạng, ví dụ: xeudungdung@gmail.com");

/** 8–72 characters (bcrypt only uses the first 72 bytes), at least one letter and one digit. */
export const passwordSchema = z
  .string()
  .min(8, "Mật khẩu cần ít nhất 8 ký tự")
  .max(72, "Mật khẩu tối đa 72 ký tự")
  .regex(/\p{L}/u, "Mật khẩu cần có ít nhất một chữ cái")
  .regex(/\d/, "Mật khẩu cần có ít nhất một chữ số");

export const langSchema = z.enum(["en", "zh"]);

export const onboardingSchema = z.object({
  display_name: displayNameSchema,
  username: usernameSchema,
  study_langs: z.array(langSchema).min(1, "Chọn ít nhất một ngôn ngữ"),
  daily_new_limit: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20)]),
});
export type OnboardingInput = z.input<typeof onboardingSchema>;

export const ttsRateSchema = z.union([z.literal(0.6), z.literal(0.85), z.literal(1)]);

export const prefsSchema = z.object({
  voice_en: z.string().max(200).nullable().optional(),
  voice_zh: z.string().max(200).nullable().optional(),
  tts_rate: ttsRateSchema.optional(),
  auto_speak: z.boolean().optional(),
  hide_images: z.boolean().optional(),
  hide_pinyin_front: z.boolean().optional(),
  tone_colors: z.boolean().optional(),
  /** Was "ai_auto_suggest" (default off); renamed when it became on by default. */
  ai_autofill: z.boolean().optional(),
  /** Puppy mascot on Today, in sessions and on end screens. */
  mascot: z.boolean().optional(),
  mascot_name: z.string().trim().min(1).max(20).optional(),
  /** Synthesized sounds in sessions and on Bin (lib/sfx.ts). */
  sound: z.boolean().optional(),
  /** Short vibrations on answers where the device has them (lib/haptics.ts). */
  haptics: z.boolean().optional(),
  /** Outfit id of Bin, one of OUTFITS in lib/progress.ts; "none" = no outfit. */
  bin_outfit: z.string().max(20).optional(),
  /** @deprecated since Bin 3.0, bones live in bin_ledger */
  bin_treats_fed: z.number().int().min(0).optional(),
  /** @deprecated since Bin 3.0, bones live in bin_ledger */
  bin_last_fed: z.string().max(10).optional(),
  /** Quest rewards taken since the start; `quests_claimed` only keeps the last 7 days, this keeps the count. */
  quests_total: z.number().int().min(0).optional(),
  /** Quests whose reward was taken, by study day: { "2026-10-24": ["due", "correct20"] }. */
  quests_claimed: z.record(z.string().max(10), z.array(z.string().max(20))).optional(),
});
export type Prefs = z.infer<typeof prefsSchema>;

export const DEFAULT_PREFS: Required<Prefs> = {
  voice_en: null,
  voice_zh: null,
  tts_rate: 0.85,
  auto_speak: true,
  hide_images: false,
  hide_pinyin_front: false,
  tone_colors: true,
  ai_autofill: true,
  mascot: true,
  mascot_name: "Bin",
  sound: true,
  haptics: true,
  bin_outfit: "none",
  bin_treats_fed: 0,
  bin_last_fed: "",
  quests_total: 0,
  quests_claimed: {},
};

export function readPrefs(raw: unknown): Required<Prefs> {
  const parsed = prefsSchema.safeParse(raw ?? {});
  return { ...DEFAULT_PREFS, ...(parsed.success ? parsed.data : {}) } as Required<Prefs>;
}

export const settingsSchema = z.object({
  display_name: displayNameSchema,
  username: usernameSchema,
  daily_new_limit: z.coerce.number().int().min(0).max(200),
  daily_goal: z.coerce.number().int().min(1).max(1000),
  study_langs: z.array(langSchema).min(1, "Chọn ít nhất một ngôn ngữ"),
});
export type SettingsInput = z.input<typeof settingsSchema>;
