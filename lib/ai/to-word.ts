import type { EnrichResult, Sense } from "./schemas";
import type { WordInput } from "@/lib/word-schema";

export type { Sense };

/** One sense, several senses (in any order), or "merge" for all of them. */
export type SenseChoice = number | number[] | "merge";

/** Indices of the chosen senses in the entry order; falls back to the first sense. */
export function chosenSenses(r: EnrichResult, choice: SenseChoice): number[] {
  if (choice === "merge") return r.senses.map((_, i) => i);
  const list = (Array.isArray(choice) ? choice : [choice]).filter((i) => i >= 0 && i < r.senses.length);
  return list.length ? [...new Set(list)].sort((x, y) => x - y) : [0];
}

/** Join parts until the next one would pass the column limit. */
function joinUpTo(parts: string[], sep: string, max: number) {
  let out = "";
  for (const p of parts) {
    const next = out ? out + sep + p : p;
    if (next.length > max) break;
    out = next;
  }
  return out || parts[0].slice(0, max);
}

/**
 * Map an AI entry to word form values (pure; used on client and server).
 * The chosen senses fill the main columns; several senses are joined.
 */
export function enrichToWord(r: EnrichResult, choice: SenseChoice = 0): Partial<WordInput> {
  const senses = chosenSenses(r, choice).map((i) => r.senses[i]);
  const many = senses.length > 1;
  const meaningVi = joinUpTo([...new Set(senses.map((s) => s.meaning_vi.trim()))], "; ", 300);
  const meaningEn = joinUpTo(senses.map((s) => s.meaning_en.trim()), " / ", 400);
  const pos = [...new Set(senses.flatMap((s) => s.pos))];
  // One sense keeps its 3 examples; several senses share 6 slots, 2 each, so every meaning shows up.
  const examples = (many ? senses.flatMap((s) => s.examples.slice(0, 2)) : senses[0].examples)
    .slice(0, many ? 6 : 3)
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

export type ImageSuggestion = { label: string; query: string };

/**
 * Photo searches for an entry, one per sense with the chosen senses first, so
 * every meaning gets pictures of that meaning (not of a homonym).
 */
export function imageSuggestions(r: EnrichResult, choice: SenseChoice = 0): ImageSuggestion[] {
  const chosen = chosenSenses(r, choice);
  const order = [...chosen, ...r.senses.map((_, i) => i).filter((i) => !chosen.includes(i))];
  const seen = new Set<string>();
  const out: ImageSuggestion[] = [];
  for (const i of order) {
    const s = r.senses[i];
    // Entries cached before per-sense queries only have the top-level one.
    const query = (s.image_query || (i === 0 ? r.image_query : "") || "").trim();
    if (!query || seen.has(query.toLowerCase())) continue;
    seen.add(query.toLowerCase());
    // First meaning, but never cut inside brackets: "bờ (sông, hồ)" stays whole.
    out.push({ label: s.meaning_vi.split(/[,;](?![^()]*\))/)[0].trim() || query, query });
  }
  if (!out.length && r.image_query?.trim()) out.push({ label: "Gợi ý", query: r.image_query.trim() });
  return out;
}
