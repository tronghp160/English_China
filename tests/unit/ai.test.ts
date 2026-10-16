import { describe, expect, it } from "vitest";
import { capEnrichResult, cleanEmoji, EnrichResultEN, EnrichResultZH, type EnrichEN, type EnrichZH } from "@/lib/ai/schemas";
import { enrichToWord } from "@/lib/ai/to-word";
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
    { pos: ["adj", "adj"], meaning_vi: "kiên cường", meaning_en: "Able to recover quickly.", examples: ex(5) },
    { pos: ["adj"], meaning_vi: "đàn hồi", meaning_en: "Returning to shape.", examples: ex(2) },
    { pos: ["adj"], meaning_vi: "a", meaning_en: "a", examples: ex(2) },
    { pos: ["adj"], meaning_vi: "b", meaning_en: "b", examples: ex(2) },
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
    expect(c.senses).toHaveLength(3);
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
  senses: [{ pos: ["adj"], meaning_vi: "kiên cường", meaning_en: "strong", examples: ex(2) }],
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
    expect(values.meaning_vi).toBe("đàn hồi");
    expect(values.reading).toBe("/rɪˈzɪliənt/");
    const parsed = wordInputSchema.safeParse({ term: "resilient", ...values });
    expect(parsed.success).toBe(true);
  });

  it("merges senses", () => {
    const r = { language: "en" as const, ...capEnrichResult(en), checks: {} };
    expect(enrichToWord(r, "merge").meaning_vi).toBe("kiên cường; đàn hồi; a");
  });

  it("maps a Chinese entry with extras", () => {
    const { result, checks } = verifyChinese(capEnrichResult(zh));
    const values = enrichToWord({ language: "zh", ...result, checks }, 0);
    expect(values.lang_extra).toMatchObject({ traditional: "堅強", han_viet: "kiên cường", needs_review: true });
    expect(wordInputSchema.safeParse({ term: "坚强", ...values }).success).toBe(true);
  });
});
