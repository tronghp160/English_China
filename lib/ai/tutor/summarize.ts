import type { EnrichResult } from "@/lib/ai/schemas";

/** What the lookupWord tool hands the model: small, verified, and without UI-only fields (emoji, image queries ...). */
export type EntrySummary = {
  term: string;
  reading: string | null;
  level: string | null;
  han_viet: string | null;
  senses: { pos: string[]; meaning_vi: string; examples: { text: string; reading: string | null; vi: string }[] }[];
  synonyms: string[];
  measure_words: string[];
  tip: string | null;
};

export function summarizeEntry(r: EnrichResult): EntrySummary {
  const senses = r.senses.slice(0, 3).map((s) => ({
    pos: s.pos,
    meaning_vi: s.meaning_vi,
    examples: s.examples.slice(0, 2).map((e) => ({ text: e.text, reading: e.reading, vi: e.vi })),
  }));
  if (r.language === "zh") {
    return {
      term: r.simplified,
      reading: r.pinyin,
      level: r.hsk ? `HSK ${r.hsk.level}` : null,
      han_viet: r.han_viet,
      senses,
      synonyms: r.synonyms.slice(0, 4),
      measure_words: r.measure_words.map((m) => `${m.char} (${m.pinyin})`),
      tip: r.memory_tip_vi,
    };
  }
  return {
    term: r.lemma,
    reading: r.ipa_us || null,
    level: r.cefr,
    han_viet: null,
    senses,
    synonyms: r.synonyms.slice(0, 4),
    measure_words: [],
    tip: r.memory_tip_vi,
  };
}
