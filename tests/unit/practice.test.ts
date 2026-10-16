import { describe, expect, it } from "vitest";
import {
  checkTyping,
  choiceOptions,
  levenshtein,
  makeCloze,
  pickDistractors,
  toneOptions,
  wordTonePattern,
  type StudyWord,
} from "@/lib/practice";

function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

let n = 0;
function w(over: Partial<StudyWord>): StudyWord {
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

describe("typing check", () => {
  it("EN ignores case, spacing and trailing punctuation", () => {
    expect(checkTyping("  Resilient. ", w({ term: "resilient" }), "en")).toBe("correct");
    expect(checkTyping("give  up", w({ term: "give up" }), "en")).toBe("correct");
  });

  it("EN allows one typo for words of 6+ letters", () => {
    expect(checkTyping("resilent", w({ term: "resilient" }), "en")).toBe("close");
    expect(checkTyping("resielnt", w({ term: "resilient" }), "en")).toBe("wrong");
    expect(checkTyping("aple", w({ term: "apple" }), "en")).toBe("wrong");
  });

  it("ZH accepts Hanzi (also traditional) and any pinyin style", () => {
    const word = w({
      language: "zh",
      term: "坚强",
      reading: "jiānqiáng",
      lang_extra: { traditional: "堅強" },
    });
    expect(checkTyping("坚强", word, "zh")).toBe("correct");
    expect(checkTyping("堅強", word, "zh")).toBe("correct");
    expect(checkTyping("jiānqiáng", word, "zh")).toBe("correct");
    expect(checkTyping("jian1qiang2", word, "zh")).toBe("correct");
    expect(checkTyping("jian qiang", word, "zh")).toBe("correct");
    expect(checkTyping("jian3qiang2", word, "zh")).toBe("wrong");
    expect(checkTyping("苹果", word, "zh")).toBe("wrong");
  });

  it("levenshtein", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("", "abc")).toBe(3);
  });
});

describe("distractors", () => {
  it("prefers same part of speech / topic, never duplicates term or meaning", () => {
    const target = w({
      term: "run",
      meaning_vi: "chạy",
      parts_of_speech: ["verb"],
      topic: "Thể thao",
    });
    const pool = [
      target,
      w({ term: "jog", meaning_vi: "chạy bộ", parts_of_speech: ["verb"], topic: "Thể thao" }),
      w({ term: "swim", meaning_vi: "bơi", parts_of_speech: ["verb"] }),
      w({ term: "Run", meaning_vi: "chạy (dup)" }),
      w({ term: "sprint", meaning_vi: "chạy", parts_of_speech: ["verb"] }),
      w({ term: "apple", meaning_vi: "quả táo", parts_of_speech: ["noun"] }),
      w({ term: "kick", meaning_vi: "đá", parts_of_speech: ["verb"] }),
    ];
    const picked = pickDistractors(target, pool, seeded(3));
    expect(picked).toHaveLength(3);
    const terms = picked.map((p) => p.term);
    expect(terms).toContain("jog");
    expect(terms).not.toContain("run");
    expect(terms).not.toContain("Run");
    expect(terms).not.toContain("sprint");
    expect(terms).not.toContain("apple");
  });

  it("options contain the target exactly once", () => {
    const target = w({});
    const opts = choiceOptions(target, [w({}), w({}), w({}), w({}), target], seeded(7));
    expect(opts).toHaveLength(4);
    expect(opts.filter((o) => o.id === target.id)).toHaveLength(1);
  });

  it("works with a tiny pool", () => {
    const target = w({});
    expect(choiceOptions(target, [target, w({})], seeded(1))).toHaveLength(2);
  });
});

describe("cloze", () => {
  it("finds the word or an inflected form, case-insensitive", () => {
    const word = w({
      term: "run",
      lang_extra: {
        verb_forms: { past: "ran", past_participle: "run", ing: "running", third_person: "runs" },
      },
      examples: [{ text: "She was running late.", vi: "Cô ấy bị trễ." }],
    });
    expect(makeCloze(word)).toEqual({
      before: "She was ",
      answer: "running",
      after: " late.",
      vi: "Cô ấy bị trễ.",
      reading: null,
    });
  });

  it("does not match inside other words", () => {
    const word = w({
      term: "art",
      examples: [
        { text: "Start the party.", vi: "" },
        { text: "Art is long.", vi: "Nghệ thuật" },
      ],
    });
    expect(makeCloze(word)?.answer).toBe("Art");
    expect(makeCloze(word)?.before).toBe("");
  });

  it("Chinese substring", () => {
    const word = w({
      language: "zh",
      term: "坚强",
      examples: [{ text: "她很坚强。", vi: "Cô ấy rất kiên cường." }],
    });
    expect(makeCloze(word)).toMatchObject({ before: "她很", answer: "坚强", after: "。" });
  });

  it("null when the word is not in any example", () => {
    expect(
      makeCloze(w({ term: "apple", examples: [{ text: "I like pears.", vi: "" }] })),
    ).toBeNull();
  });
});

describe("tones", () => {
  it("pattern only when syllables match characters", () => {
    expect(wordTonePattern({ term: "坚强", reading: "jiānqiáng" })).toBe("1-2");
    expect(wordTonePattern({ term: "妈妈", reading: "māma" })).toBe("1-5");
    expect(wordTonePattern({ term: "坚强", reading: "jiān" })).toBeNull();
    expect(wordTonePattern({ term: "坚强", reading: null })).toBeNull();
  });

  it("4 distinct options of the same length incl. the answer", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const opts = toneOptions("3-4", seeded(seed));
      expect(new Set(opts).size).toBe(4);
      expect(opts).toContain("3-4");
      opts.forEach((o) => expect(o.split("-")).toHaveLength(2));
    }
    expect(toneOptions("2", seeded(1)).sort()).toEqual(["1", "2", "3", "4"]);
  });
});
