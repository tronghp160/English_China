import type { Tables } from "@/lib/supabase/database.types";
import type { Collocation, Example, FamilyItem, ImageSource, LangExtra, WordInput } from "@/lib/word-schema";
import type { PosCode } from "@/lib/pos";

export type WordRow = Tables<"words">;

export function examplesOf(w: Pick<WordRow, "examples">): Example[] {
  return Array.isArray(w.examples) ? (w.examples as unknown as Example[]) : [];
}
export function collocationsOf(w: Pick<WordRow, "collocations">): Collocation[] {
  return Array.isArray(w.collocations) ? (w.collocations as unknown as Collocation[]) : [];
}
export function familyOf(w: Pick<WordRow, "word_family">): FamilyItem[] {
  return Array.isArray(w.word_family) ? (w.word_family as unknown as FamilyItem[]) : [];
}
export function extraOf(w: Pick<WordRow, "lang_extra">): LangExtra {
  return (w.lang_extra ?? {}) as LangExtra;
}
export function imageSourceOf(w: Pick<WordRow, "image_source">): ImageSource | null {
  return (w.image_source ?? null) as ImageSource | null;
}

/** DB row -> form values (strings instead of nulls for inputs). */
export function rowToWordInput(w: WordRow): WordInput {
  const extra = extraOf(w);
  return {
    term: w.term,
    reading: w.reading ?? "",
    parts_of_speech: w.parts_of_speech as PosCode[],
    meaning_vi: w.meaning_vi,
    meaning_en: w.meaning_en ?? "",
    examples: examplesOf(w).map((e) => ({ text: e.text, reading: e.reading ?? "", vi: e.vi ?? "" })),
    synonyms: w.synonyms,
    antonyms: w.antonyms,
    collocations: collocationsOf(w).map((c) => ({ text: c.text, reading: c.reading ?? "", vi: c.vi ?? "" })),
    word_family: familyOf(w).map((f) => ({ text: f.text, pos: f.pos ?? null, vi: f.vi ?? "" })),
    topic: w.topic ?? "",
    emoji: w.emoji ?? "",
    image_url: w.image_url,
    image_source: imageSourceOf(w),
    personal_note: w.personal_note ?? "",
    lang_extra: {
      ...extra,
      verb_forms: extra.verb_forms ?? { past: "", past_participle: "", ing: "", third_person: "" },
    },
    ai_generated: w.ai_generated,
  };
}
