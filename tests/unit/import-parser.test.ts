import { describe, expect, it } from "vitest";
import { MAX_IMPORT, parseImport } from "@/lib/import-parser";

const pick = (text: string, lang: "en" | "zh" = "en", existing: string[] = []) =>
  parseImport(text, lang, existing).lines.map((l) => ({
    term: l.term,
    meaning: l.meaning_vi,
    reading: l.reading,
    status: l.status,
  }));

describe("parseImport — English", () => {
  it("accepts a bare term", () => {
    expect(pick("apple")).toEqual([{ term: "apple", meaning: null, reading: null, status: "ok" }]);
  });

  it.each([
    ["apple - quả táo"],
    ["apple: quả táo"],
    ["apple = quả táo"],
    ["apple\tquả táo"],
    ["apple – quả táo"],
    ["apple — quả táo"],
    ["apple : quả táo"],
  ])("keeps the user's meaning in %j", (line) => {
    expect(pick(line)[0]).toMatchObject({ term: "apple", meaning: "quả táo", status: "ok" });
  });

  it("does not split hyphenated words", () => {
    expect(pick("well-known - nổi tiếng")[0]).toMatchObject({ term: "well-known", meaning: "nổi tiếng" });
    expect(pick("check-in")[0]).toMatchObject({ term: "check-in", meaning: null });
  });

  it("keeps multi-word terms and phrasal verbs", () => {
    expect(pick("give up: từ bỏ")[0]).toMatchObject({ term: "give up", meaning: "từ bỏ" });
  });

  it("strips numbering and bullets, skips blank lines", () => {
    const r = pick("1. apple - táo\n\n2) banana\n- cherry\n• grape: nho");
    expect(r.map((x) => x.term)).toEqual(["apple", "banana", "cherry", "grape"]);
  });

  it("flags duplicates inside the paste and against the deck", () => {
    const r = pick("Apple\napple - táo\nbanana", "en", ["banana"]);
    expect(r.map((x) => x.status)).toEqual(["ok", "duplicate", "duplicate"]);
  });

  it("flags errors", () => {
    expect(pick("苹果")[0].status).toBe("error");
    expect(pick("x".repeat(81))[0].status).toBe("error");
    expect(pick(": quả táo")[0].status).toBe("error");
  });

  it(`caps the import at ${MAX_IMPORT} words`, () => {
    const text = Array.from({ length: 105 }, (_, i) => `word${i}`).join("\n");
    const res = parseImport(text, "en");
    expect(res.ok).toHaveLength(MAX_IMPORT);
    expect(res.truncated).toBe(true);
  });

  it("parses CSV with a header row", () => {
    const csv = 'term,meaning_vi,reading\nresilient,"kiên cường, mau phục hồi",/rɪˈzɪliənt/\napple,,\n';
    expect(pick(csv)).toEqual([
      { term: "resilient", meaning: "kiên cường, mau phục hồi", reading: "/rɪˈzɪliənt/", status: "ok" },
      { term: "apple", meaning: null, reading: null, status: "ok" },
    ]);
  });

  it("parses an Excel paste (tabs) without header", () => {
    expect(pick("apple\tquả táo\nbanana\tchuối")).toEqual([
      { term: "apple", meaning: "quả táo", reading: null, status: "ok" },
      { term: "banana", meaning: "chuối", reading: null, status: "ok" },
    ]);
  });
});

describe("parseImport — Chinese", () => {
  it("accepts a bare Hanzi term", () => {
    expect(pick("坚强", "zh")[0]).toMatchObject({ term: "坚强", meaning: null, reading: null, status: "ok" });
  });

  it("splits term - meaning", () => {
    expect(pick("苹果 - quả táo", "zh")[0]).toMatchObject({ term: "苹果", meaning: "quả táo", reading: null });
  });

  it("splits term, pinyin and meaning separated by spaces", () => {
    expect(pick("苹果 píngguǒ quả táo", "zh")[0]).toMatchObject({ term: "苹果", reading: "píngguǒ", meaning: "quả táo" });
    expect(pick("苹果 píng guǒ quả táo", "zh")[0]).toMatchObject({ term: "苹果", reading: "píng guǒ", meaning: "quả táo" });
  });

  it("does not eat a Vietnamese meaning that looks like pinyin", () => {
    // "táo" is valid pinyin letters, but the reading already covers both characters.
    expect(pick("苹果 píngguǒ táo", "zh")[0]).toMatchObject({ reading: "píngguǒ", meaning: "táo" });
    expect(pick("你好 xin chào", "zh")[0]).toMatchObject({ term: "你好", reading: null, meaning: "xin chào" });
  });

  it("handles pinyin before a separator", () => {
    expect(pick("苹果 píngguǒ - quả táo", "zh")[0]).toMatchObject({ term: "苹果", reading: "píngguǒ", meaning: "quả táo" });
  });

  it("dedupes traditional vs simplified", () => {
    expect(pick("堅強\n坚强", "zh").map((x) => x.status)).toEqual(["ok", "duplicate"]);
  });

  it("rejects lines without Hanzi in a Chinese deck", () => {
    expect(pick("apple", "zh")[0].status).toBe("error");
  });
});
