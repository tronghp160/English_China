import { z } from "zod";
import { POS_CODES } from "@/lib/pos";

/**
 * AI enrichment schemas (docs/PLAN.md §7.2).
 *
 * Generation schemas are intentionally tolerant about array lengths: Claude's
 * structured outputs ignore minItems/maxItems, so instead of failing a whole
 * request when the model returns 4 examples instead of 3, we accept it and
 * trim with `capEnrichResult()`. Optional values are `nullable` (structured
 * outputs require every property).
 */

export const PosCode = z.enum(POS_CODES);

export const Example = z.object({
  text: z.string(),
  reading: z.string().nullable(), // sentence pinyin (zh only)
  vi: z.string(),
});

export const Sense = z.object({
  pos: z.array(PosCode),
  meaning_vi: z.string(),
  meaning_en: z.string(),
  examples: z.array(Example),
  /** English photo search words for this sense (so "bank" of a river gets river photos). */
  image_query: z.string(),
});
export type Sense = z.infer<typeof Sense>;

export const EnrichResultEN = z.object({
  is_valid_word: z.boolean(),
  did_you_mean: z.string().nullable(),
  lemma: z.string(),
  ipa_us: z.string(),
  ipa_uk: z.string().nullable(),
  cefr: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).nullable(),
  senses: z.array(Sense).min(1),
  synonyms: z.array(z.string()),
  antonyms: z.array(z.string()),
  collocations: z.array(z.object({ text: z.string(), vi: z.string() })),
  word_family: z.array(z.object({ text: z.string(), pos: PosCode, vi: z.string() })),
  verb_forms: z
    .object({ past: z.string(), past_participle: z.string(), ing: z.string(), third_person: z.string() })
    .nullable(),
  plural: z.string().nullable(),
  topic_vi: z.string(),
  emoji: z.string(),
  image_query: z.string(),
  memory_tip_vi: z.string().nullable(),
});
export type EnrichEN = z.infer<typeof EnrichResultEN>;

export const EnrichResultZH = z.object({
  is_valid_word: z.boolean(),
  did_you_mean: z.string().nullable(),
  simplified: z.string(),
  traditional: z.string(),
  pinyin: z.string(),
  pinyin_numbered: z.string(),
  hsk: z.object({ level: z.number().int(), version: z.enum(["2.0", "3.0"]) }).nullable(),
  senses: z.array(Sense).min(1),
  measure_words: z.array(z.object({ char: z.string(), pinyin: z.string() })),
  characters: z.array(
    z.object({ char: z.string(), pinyin: z.string(), meaning_vi: z.string(), radical: z.string() }),
  ),
  synonyms: z.array(z.string()),
  antonyms: z.array(z.string()),
  collocations: z.array(z.object({ text: z.string(), reading: z.string(), vi: z.string() })),
  han_viet: z.string().nullable(),
  topic_vi: z.string(),
  emoji: z.string(),
  image_query: z.string(),
  memory_tip_vi: z.string().nullable(),
});
export type EnrichZH = z.infer<typeof EnrichResultZH>;

/** Result returned to the client: language-tagged, with server-side checks applied. */
export type EnrichResult =
  | ({ language: "en" } & EnrichEN & { checks: EnrichChecks })
  | ({ language: "zh" } & EnrichZH & { checks: EnrichChecks });

export type EnrichChecks = {
  /** pinyin-pro disagreed with the AI pinyin (polyphonic characters) */
  pinyin_needs_review?: boolean;
  /** the AI pinyin was replaced by pinyin-pro's */
  pinyin_corrected?: boolean;
  traditional_corrected?: boolean;
};

const LIMITS = {
  senses: 4,
  examples: 3,
  synonyms: 6,
  antonyms: 4,
  collocations: 5,
  word_family: 6,
  measure_words: 3,
  characters: 12,
} as const;

/** Count of user-perceived characters (grapheme clusters). */
function graphemes(s: string): string[] {
  const seg = new Intl.Segmenter("en", { granularity: "grapheme" });
  return [...seg.segment(s)].map((x) => x.segment);
}

/** Exactly one emoji grapheme, otherwise empty (§7.2 "sai thì bỏ"). */
export function cleanEmoji(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  const g = graphemes(s);
  if (g.length !== 1) return "";
  return /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(g[0]) ? g[0] : "";
}

function nullIfEmpty<T>(v: T): T | null {
  if (typeof v === "string") return (v.trim() ? v.trim() : null) as T | null;
  return v;
}

function uniq(list: string[]) {
  return [...new Set(list.map((s) => s.trim()).filter(Boolean))];
}

/** Trim arrays to plan limits, drop empty strings, normalize emoji. */
export function capEnrichResult<T extends EnrichEN | EnrichZH>(r: T, opts: { senses?: number } = {}): T {
  const out = { ...r } as Record<string, unknown>;
  out.did_you_mean = nullIfEmpty(r.did_you_mean);
  out.memory_tip_vi = nullIfEmpty(r.memory_tip_vi);
  out.emoji = cleanEmoji(r.emoji);
  out.senses = r.senses.slice(0, opts.senses ?? LIMITS.senses).map((s) => ({
    ...s,
    pos: [...new Set(s.pos)],
    examples: s.examples
      .filter((e) => e.text.trim())
      .slice(0, LIMITS.examples)
      .map((e) => ({ ...e, reading: nullIfEmpty(e.reading) })),
    image_query: (s.image_query ?? "").trim(),
  }));
  out.synonyms = uniq(r.synonyms).slice(0, LIMITS.synonyms);
  out.antonyms = uniq(r.antonyms).slice(0, LIMITS.antonyms);
  out.collocations = r.collocations.filter((c) => c.text.trim()).slice(0, LIMITS.collocations);
  if ("word_family" in r) out.word_family = r.word_family.filter((w) => w.text.trim()).slice(0, LIMITS.word_family);
  if ("ipa_uk" in r) {
    out.ipa_uk = nullIfEmpty(r.ipa_uk);
    out.plural = nullIfEmpty(r.plural);
  }
  if ("measure_words" in r) {
    out.measure_words = r.measure_words.filter((m) => m.char.trim()).slice(0, LIMITS.measure_words);
    out.characters = r.characters.filter((c) => c.char.trim()).slice(0, LIMITS.characters);
    out.han_viet = nullIfEmpty(r.han_viet);
    if (r.hsk && (r.hsk.level < 1 || r.hsk.level > 9)) out.hsk = null;
  }
  return out as T;
}
