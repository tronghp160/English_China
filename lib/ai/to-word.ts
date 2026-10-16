import type { EnrichResult } from "./schemas";
import type { WordInput } from "@/lib/word-schema";

export type SenseChoice = number | "merge";

/**
 * Map an AI entry to word form values (pure; used on client and server).
 * The chosen sense fills the main columns; "merge" joins all senses.
 */
export function enrichToWord(r: EnrichResult, choice: SenseChoice = 0): Partial<WordInput> {
  const senses = choice === "merge" ? r.senses : [r.senses[Math.min(choice, r.senses.length - 1)]];
  const primary = senses[0];
  const meaningVi =
    choice === "merge" ? [...new Set(r.senses.map((s) => s.meaning_vi.trim()))].join("; ") : primary.meaning_vi;
  const meaningEn = choice === "merge" ? r.senses.map((s) => s.meaning_en).join(" / ") : primary.meaning_en;
  const pos = [...new Set(senses.flatMap((s) => s.pos))];
  const examples = senses
    .flatMap((s) => s.examples)
    .slice(0, choice === "merge" ? 6 : 3)
    .map((e) => ({ text: e.text, reading: r.language === "zh" ? e.reading ?? "" : "", vi: e.vi }));

  const common: Partial<WordInput> = {
    meaning_vi: meaningVi,
    meaning_en: meaningEn,
    parts_of_speech: pos,
    examples,
    synonyms: r.synonyms,
    antonyms: r.antonyms,
    topic: r.topic_vi || "",
    emoji: r.emoji || "",
    personal_note: r.memory_tip_vi ?? "",
  };

  if (r.language === "zh") {
    return {
      ...common,
      reading: r.pinyin,
      collocations: r.collocations.map((c) => ({ text: c.text, reading: c.reading, vi: c.vi })),
      word_family: [],
      lang_extra: {
        traditional: r.traditional,
        pinyin_numbered: r.pinyin_numbered,
        han_viet: r.han_viet ?? "",
        hsk: r.hsk,
        measure_words: r.measure_words,
        characters: r.characters,
        needs_review: r.checks.pinyin_needs_review ?? false,
      },
    };
  }
  return {
    ...common,
    reading: r.ipa_us,
    collocations: r.collocations.map((c) => ({ text: c.text, reading: "", vi: c.vi })),
    word_family: r.word_family.map((w) => ({ text: w.text, pos: w.pos, vi: w.vi })),
    lang_extra: {
      cefr: r.cefr,
      us_ipa: r.ipa_us,
      uk_ipa: r.ipa_uk ?? "",
      plural: r.plural ?? "",
      verb_forms: r.verb_forms,
    },
  };
}
