import { describe, expect, it } from "vitest";
import { checkEnglishAnswer, editDistance } from "@/lib/lang/en";
import { normalizeEn, normalizeTerm, normalizeZh } from "@/lib/lang/normalize";
import { LANGUAGES } from "@/lib/lang/registry";

describe("normalize", () => {
  it("EN: lowercase, trim, collapse spaces, unify apostrophes", () => {
    expect(normalizeEn("  Give   Up ")).toBe("give up");
    expect(normalizeEn("Don’t")).toBe("don't");
    expect(normalizeEn("RESILIENT\n")).toBe("resilient");
  });
  it("ZH: traditional -> simplified, no whitespace", () => {
    expect(normalizeZh("堅強")).toBe("坚强");
    expect(normalizeZh(" 坚 强 ")).toBe("坚强");
    expect(normalizeZh("頭髮")).toBe("头发");
  });
  it("ZH: full-width latin is folded", () => {
    expect(normalizeZh("ＡＢＣ")).toBe("abc");
  });
  it("dispatches by language", () => {
    expect(normalizeTerm("Apple", "en")).toBe("apple");
    expect(normalizeTerm("蘋果", "zh")).toBe("苹果");
  });
});

describe("registry", () => {
  it("builds toneless reading keys for zh", () => {
    expect(LANGUAGES.zh.readingKey("jiānqiáng")).toBe("jianqiang");
    expect(LANGUAGES.en.readingKey("/rɪˈzɪliənt/")).toBeNull();
  });
});

describe("english typing check", () => {
  it("is case-insensitive", () => {
    expect(checkEnglishAnswer("Resilient", "resilient")).toBe("correct");
  });
  it("allows one typo for words with 6+ letters", () => {
    expect(checkEnglishAnswer("resilant", "resilient")).toBe("wrong"); // 2 edits
    expect(checkEnglishAnswer("resilent", "resilient")).toBe("almost");
    expect(checkEnglishAnswer("reislient", "resilient")).toBe("almost"); // transposition
    expect(checkEnglishAnswer("aple", "apple")).toBe("wrong"); // short word
  });
  it("rejects empty input", () => {
    expect(checkEnglishAnswer("  ", "apple")).toBe("wrong");
  });
  it("computes edit distance", () => {
    expect(editDistance("kitten", "sitting")).toBe(3);
    expect(editDistance("ab", "ba")).toBe(1);
  });
});
