import type { StudyWord } from "@/lib/practice";

/** Deterministic rng (Park–Miller) for the practice tests. */
export function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

let n = 0;
export function word(over: Partial<StudyWord> = {}): StudyWord {
  n++;
  return {
    id: `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`,
    deck_id: "d",
    created_by: null,
    language: "en",
    term: `word${n}`,
    reading: null,
    parts_of_speech: [],
    meaning_vi: `nghĩa ${n}`,
    meaning_en: null,
    examples: [],
    synonyms: [],
    antonyms: [],
    collocations: [],
    word_family: [],
    topic: null,
    emoji: null,
    image_url: null,
    image_source: null,
    lang_extra: {},
    personal_note: null,
    ai_generated: false,
    created_at: "2026-10-16T00:00:00Z",
    updated_at: "2026-10-16T00:00:00Z",
    ...over,
  } as StudyWord;
}

export function words(count: number, over: Partial<StudyWord> = {}): StudyWord[] {
  return Array.from({ length: count }, () => word(over));
}
