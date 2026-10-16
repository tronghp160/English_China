import { z } from "zod";
import { POS_CODES } from "@/lib/pos";

export const text = (max: number) => z.string().trim().max(max, `Tối đa ${max} ký tự`);
export const optionalText = (max: number) =>
  text(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const exampleSchema = z.object({
  text: text(300).min(1, "Nhập câu ví dụ"),
  reading: optionalText(400),
  vi: text(300),
});

export const collocationSchema = z.object({
  text: text(120).min(1),
  reading: optionalText(200),
  vi: text(200),
});

export const familySchema = z.object({
  text: text(80).min(1),
  pos: z.enum(POS_CODES).nullable().optional(),
  vi: text(200),
});

export const imageSourceSchema = z.object({
  provider: z.enum(["pexels", "unsplash", "upload"]),
  author: z.string().max(200).nullable().optional(),
  author_url: z.string().url().max(500).nullable().optional(),
  page_url: z.string().url().max(500).nullable().optional(),
  storage_path: z.string().max(300).nullable().optional(),
});
export type ImageSource = z.infer<typeof imageSourceSchema>;

export const enExtraSchema = z.object({
  cefr: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).nullable().optional(),
  us_ipa: optionalText(80),
  uk_ipa: optionalText(80),
  plural: optionalText(80),
  verb_forms: z
    .object({
      past: text(60),
      past_participle: text(60),
      ing: text(60),
      third_person: text(60),
    })
    .nullable()
    .optional(),
});

export const zhExtraSchema = z.object({
  traditional: optionalText(80),
  pinyin_numbered: optionalText(200),
  han_viet: optionalText(120),
  hsk: z
    .object({ level: z.number().int().min(1).max(9), version: z.enum(["2.0", "3.0"]) })
    .nullable()
    .optional(),
  measure_words: z.array(z.object({ char: text(4).min(1), pinyin: text(20) })).max(3).optional(),
  characters: z
    .array(
      z.object({
        char: text(2).min(1),
        pinyin: text(20),
        meaning_vi: text(120),
        radical: text(4),
      }),
    )
    .max(12)
    .optional(),
  needs_review: z.boolean().optional(), // AI pinyin disagreed with pinyin-pro
});

/** One object for both languages; keys of the other language are simply absent. */
export const langExtraSchema = enExtraSchema.extend(zhExtraSchema.shape).partial();
export type LangExtra = z.infer<typeof langExtraSchema>;

const urlOrNull = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => !v || /^https:\/\//.test(v), "Ảnh phải là đường dẫn https")
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));

export const wordInputSchema = z.object({
  term: text(80).min(1, "Nhập từ"),
  reading: optionalText(200),
  parts_of_speech: z.array(z.enum(POS_CODES)).max(6).default([]),
  meaning_vi: text(300).min(1, "Nhập nghĩa tiếng Việt"),
  meaning_en: optionalText(400),
  examples: z.array(exampleSchema).max(6).default([]),
  synonyms: z.array(text(80).min(1)).max(10).default([]),
  antonyms: z.array(text(80).min(1)).max(10).default([]),
  collocations: z.array(collocationSchema).max(8).default([]),
  word_family: z.array(familySchema).max(8).default([]),
  topic: optionalText(60),
  emoji: optionalText(16),
  image_url: urlOrNull,
  image_source: imageSourceSchema.nullable().optional(),
  personal_note: optionalText(1000),
  lang_extra: langExtraSchema.default({}),
  ai_generated: z.boolean().default(false),
});

export type WordInput = z.input<typeof wordInputSchema>;
export type WordData = z.output<typeof wordInputSchema>;

export type EnExtra = z.infer<typeof enExtraSchema>;
export type ZhExtra = z.infer<typeof zhExtraSchema>;
export type Example = z.infer<typeof exampleSchema>;
export type Collocation = z.infer<typeof collocationSchema>;
export type FamilyItem = z.infer<typeof familySchema>;

export const emptyWord = (): WordInput => ({
  term: "",
  reading: "",
  parts_of_speech: [],
  meaning_vi: "",
  meaning_en: "",
  examples: [],
  synonyms: [],
  antonyms: [],
  collocations: [],
  word_family: [],
  topic: "",
  emoji: "",
  image_url: null,
  image_source: null,
  personal_note: "",
  lang_extra: {},
  ai_generated: false,
});

export const deckInputSchema = z
  .object({
    name: text(80).min(1, "Nhập tên bộ từ"),
    description: optionalText(500),
    language: z.enum(["en", "zh"]),
    visibility: z.enum(["private", "group", "public"]),
    group_id: z.string().uuid().nullable().optional(),
    allow_member_edit: z.boolean().default(false),
    enable_recall: z.boolean().default(true),
  })
  .refine((v) => v.visibility !== "group" || Boolean(v.group_id), {
    message: "Chọn nhóm cho bộ từ",
    path: ["group_id"],
  });
export type DeckInput = z.input<typeof deckInputSchema>;
