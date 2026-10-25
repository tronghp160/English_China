import { describe, expect, it } from "vitest";
import { capEnrichResult, cleanEmoji, EnrichResultEN, EnrichResultZH, type EnrichEN, type EnrichZH } from "@/lib/ai/schemas";
import { enrichToWord, imageSuggestions } from "@/lib/ai/to-word";
import { verifyChinese } from "@/lib/ai/verify";
import { wordInputSchema } from "@/lib/word-schema";

const ex = (n: number) => Array.from({ length: n }, (_, i) => ({ text: `Sentence ${i}.`, reading: null, vi: `Câu ${i}.` }));

const en: EnrichEN = {
  is_valid_word: true,
  did_you_mean: "",
  lemma: "resilient",
  ipa_us: "/rɪˈzɪliənt/",
  ipa_uk: "",
  cefr: "B2",
  senses: [
    { pos: ["adj", "adj"], meaning_vi: "kiên cường", meaning_en: "Able to recover quickly.", examples: ex(5), image_query: " tree growing through rock " },
    { pos: ["adj"], meaning_vi: "đàn hồi, co giãn", meaning_en: "Returning to shape.", examples: ex(2), image_query: "rubber band stretch" },
    { pos: ["adj"], meaning_vi: "a", meaning_en: "a", examples: ex(2), image_query: "Tree growing through rock" },
    { pos: ["adj"], meaning_vi: "b", meaning_en: "b", examples: ex(2), image_query: "" },
    ...Array.from({ length: 4 }, (_, i) => ({ pos: ["adj" as const], meaning_vi: `x${i}`, meaning_en: "x", examples: ex(1), image_query: `x${i}` })),
  ],
  synonyms: ["tough", "tough", "strong", "hardy", "robust", "flexible", "buoyant", "irrepressible"],
  antonyms: ["fragile", "weak", "brittle", "delicate", "frail"],
  collocations: [{ text: "resilient economy", vi: "nền kinh tế vững vàng" }],
  word_family: [{ text: "resilience", pos: "noun", vi: "sự kiên cường" }],
  verb_forms: null,
  plural: null,
  topic_vi: "Tính cách",
  emoji: "🌱",
  image_query: "tree growing through rock",
  memory_tip_vi: "",
};

describe("AI schemas", () => {
  it("accept a well-formed English entry", () => {
    expect(EnrichResultEN.safeParse(en).success).toBe(true);
  });

  it("caps arrays and cleans empty strings", () => {
    const c = capEnrichResult(en);
    expect(c.senses).toHaveLength(4);
    expect(capEnrichResult(en, { senses: 8 }).senses.length).toBeGreaterThan(4);
    expect(c.senses[0].image_query).toBe("tree growing through rock");
    expect(c.senses[0].examples).toHaveLength(3);
    expect(c.senses[0].pos).toEqual(["adj"]);
    expect(c.synonyms).toEqual(["tough", "strong", "hardy", "robust", "flexible", "buoyant"]);
    expect(c.antonyms).toHaveLength(4);
    expect(c.did_you_mean).toBeNull();
    expect(c.ipa_uk).toBeNull();
    expect(c.memory_tip_vi).toBeNull();
  });

  it("requires at least one sense", () => {
    expect(EnrichResultEN.safeParse({ ...en, senses: [] }).success).toBe(false);
  });
});

describe("cleanEmoji", () => {
  it("keeps exactly one emoji grapheme", () => {
    expect(cleanEmoji("🌱")).toBe("🌱");
    expect(cleanEmoji(" 👨‍👩‍👧 ")).toBe("👨‍👩‍👧");
    expect(cleanEmoji("🇻🇳")).toBe("🇻🇳");
  });
  it("drops text, multiple emoji or empty", () => {
    expect(cleanEmoji("🌱🌳")).toBe("");
    expect(cleanEmoji("tree")).toBe("");
    expect(cleanEmoji("")).toBe("");
    expect(cleanEmoji(null)).toBe("");
  });
});

const zh: EnrichZH = {
  is_valid_word: true,
  did_you_mean: null,
  simplified: "坚强",
  traditional: "坚强", // wrong on purpose
  pinyin: "jiānqiǎng", // wrong tone on purpose (强 is polyphonic: qiáng / qiǎng / jiàng)
  pinyin_numbered: "jian1 qiang3",
  hsk: { level: 5, version: "2.0" },
  senses: [{ pos: ["adj"], meaning_vi: "kiên cường", meaning_en: "strong", examples: ex(2), image_query: "strong person" }],
  measure_words: [],
  characters: [
    { char: "坚", pinyin: "jiān", meaning_vi: "vững", radical: "土" },
    { char: "强", pinyin: "qiáng", meaning_vi: "mạnh", radical: "弓" },
  ],
  synonyms: [],
  antonyms: [],
  collocations: [],
  han_viet: "kiên cường",
  topic_vi: "Tính cách",
  emoji: "💪",
  image_query: "strong person",
  memory_tip_vi: null,
};

describe("verifyChinese", () => {
  it("fixes the traditional form with opencc", () => {
    const { result, checks } = verifyChinese(zh);
    expect(result.traditional).toBe("堅強");
    expect(checks.traditional_corrected).toBe(true);
  });

  it("keeps AI pinyin for polyphonic characters but flags it", () => {
    const { result, checks } = verifyChinese(zh);
    expect(result.pinyin).toBe("jiānqiǎng");
    expect(checks.pinyin_needs_review).toBe(true);
  });

  it("replaces wrong pinyin when no character is polyphonic", () => {
    const { result, checks } = verifyChinese({ ...zh, simplified: "苹果", traditional: "蘋果", pinyin: "pīngguǒ", pinyin_numbered: "" });
    expect(result.pinyin).toBe("píngguǒ");
    expect(result.pinyin_numbered).toBe("ping2 guo3");
    expect(checks.pinyin_corrected).toBe(true);
  });

  it("accepts correct pinyin untouched", () => {
    const { result, checks } = verifyChinese({ ...zh, pinyin: "jiānqiáng", traditional: "堅強" });
    expect(result.pinyin).toBe("jiānqiáng");
    expect(checks).toEqual({});
  });

  it("schema accepts the entry", () => {
    expect(EnrichResultZH.safeParse(zh).success).toBe(true);
  });
});

describe("enrichToWord", () => {
  it("maps the chosen sense into a valid word form (EN)", () => {
    const r = { language: "en" as const, ...capEnrichResult(en), checks: {} };
    const values = enrichToWord(r, 1);
    expect(values.meaning_vi).toBe("đàn hồi, co giãn");
    expect(values.reading).toBe("/rɪˈzɪliənt/");
    const parsed = wordInputSchema.safeParse({ term: "resilient", ...values });
    expect(parsed.success).toBe(true);
  });

  it("merges senses", () => {
    const r = { language: "en" as const, ...capEnrichResult(en, { senses: 6 }), checks: {} };
    expect(enrichToWord(r, "merge").meaning_vi).toBe("kiên cường; đàn hồi, co giãn; a; b; x0; x1");
  });

  it("joins several chosen senses with 2 examples each", () => {
    const r = { language: "en" as const, ...capEnrichResult(en), checks: {} };
    const values = enrichToWord(r, [2, 0]);
    expect(values.meaning_vi).toBe("kiên cường; a");
    expect(values.meaning_en).toBe("Able to recover quickly. / a");
    expect(values.examples).toHaveLength(4);
    expect(enrichToWord(r, [9]).meaning_vi).toBe("kiên cường"); // out of range falls back
    expect(wordInputSchema.safeParse({ term: "resilient", ...values }).success).toBe(true);
  });

  it("keeps joined meanings within the column limits", () => {
    const long = "y".repeat(120);
    const r = {
      language: "en" as const,
      ...capEnrichResult({ ...en, senses: en.senses.map((s) => ({ ...s, meaning_vi: `${s.meaning_vi} ${long}` })) }),
      checks: {},
    };
    const values = enrichToWord(r, "merge");
    expect(values.meaning_vi!.length).toBeLessThanOrEqual(300);
    expect(values.meaning_vi!.split("; ")).toHaveLength(2);
  });

  it("maps a Chinese entry with extras", () => {
    const { result, checks } = verifyChinese(capEnrichResult(zh));
    const values = enrichToWord({ language: "zh", ...result, checks }, 0);
    expect(values.lang_extra).toMatchObject({ traditional: "堅強", han_viet: "kiên cường", needs_review: true });
    expect(wordInputSchema.safeParse({ term: "坚强", ...values }).success).toBe(true);
  });
});

describe("imageSuggestions", () => {
  const r = { language: "en" as const, ...capEnrichResult(en, { senses: 6 }), checks: {} };

  it("gives one search per sense, chosen senses first, without duplicates", () => {
    const list = imageSuggestions(r, [1]);
    expect(list[0]).toEqual({ label: "đàn hồi", query: "rubber band stretch" });
    expect(list[1]).toEqual({ label: "kiên cường", query: "tree growing through rock" });
    // sense "a" repeats the first query (case-insensitive) and "b" has none
    expect(list.map((x) => x.label)).toEqual(["đàn hồi", "kiên cường", "x0", "x1"]);
  });

  it("falls back to the top-level query for entries without per-sense ones", () => {
    const old = { ...r, senses: r.senses.map((s) => ({ ...s, image_query: "" })) };
    expect(imageSuggestions(old, 0)).toEqual([{ label: "kiên cường", query: "tree growing through rock" }]);
  });
});
