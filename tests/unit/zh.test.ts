import { describe, expect, it } from "vitest";
import {
  containsHan,
  markSyllable,
  markedToNumbered,
  numberedToMarked,
  pinyinMatches,
  pinyinSearchKey,
  segmentPinyin,
  stripTones,
  toneOf,
  tonePattern,
} from "@/lib/lang/zh";

describe("toneOf", () => {
  it("reads tone marks", () => {
    expect(toneOf("jiān")).toBe(1);
    expect(toneOf("qiáng")).toBe(2);
    expect(toneOf("nǚ")).toBe(3);
    expect(toneOf("gè")).toBe(4);
    expect(toneOf("ma")).toBe(5);
  });
  it("reads tone numbers", () => {
    expect(toneOf("jian1")).toBe(1);
    expect(toneOf("ma0")).toBe(5);
    expect(toneOf("ma5")).toBe(5);
  });
});

describe("stripTones / search key", () => {
  it("removes marks but keeps ü", () => {
    expect(stripTones("Jiānqiáng")).toBe("jianqiang");
    expect(stripTones("nǚ'ér")).toBe("nü'er");
    expect(stripTones("jian1 qiang2")).toBe("jian qiang");
  });
  it("makes ascii keys", () => {
    expect(pinyinSearchKey("nǚ ér")).toBe("nuer");
    expect(pinyinSearchKey("lv4")).toBe("lu");
  });
});

describe("marking", () => {
  it("follows placement rules", () => {
    expect(markSyllable("hao", 3)).toBe("hǎo");
    expect(markSyllable("xue", 2)).toBe("xué");
    expect(markSyllable("dou", 1)).toBe("dōu");
    expect(markSyllable("liu", 2)).toBe("liú");
    expect(markSyllable("gui", 4)).toBe("guì");
    expect(markSyllable("lv", 4)).toBe("lǜ");
    expect(markSyllable("ma", 5)).toBe("ma");
  });
  it("converts numbered <-> marked", () => {
    expect(numberedToMarked("jian1 qiang2")).toBe("jiānqiáng");
    expect(numberedToMarked("ni3 hao3", " ")).toBe("nǐ hǎo");
    expect(markedToNumbered(["mā", "ma"])).toBe("ma1 ma5");
  });
});

describe("segmentPinyin", () => {
  it("splits joined syllables", () => {
    expect(segmentPinyin("jiānqiáng")).toEqual(["jiān", "qiáng"]);
    expect(segmentPinyin("píngguǒ")).toEqual(["píng", "guǒ"]);
    expect(segmentPinyin("xiànzài")).toEqual(["xiàn", "zài"]);
    expect(segmentPinyin("nǚ'ér")).toEqual(["nǚ", "ér"]);
    expect(segmentPinyin("Zhōngguó")).toEqual(["Zhōng", "guó"]);
    expect(segmentPinyin("jian1qiang2")).toEqual(["jian1", "qiang2"]);
  });
  it("respects spaces", () => {
    expect(segmentPinyin("nǐ hǎo")).toEqual(["nǐ", "hǎo"]);
  });
  it("prefers valid splits for ambiguous strings", () => {
    expect(segmentPinyin("tiān'ānmén")).toEqual(["tiān", "ān", "mén"]);
    expect(segmentPinyin("xīngqī")).toEqual(["xīng", "qī"]);
  });
  it("returns non-pinyin chunks unchanged", () => {
    expect(segmentPinyin("hello")).toEqual(["hello"]);
  });
});

describe("tonePattern", () => {
  it("builds tone patterns", () => {
    expect(tonePattern("jiānqiáng")).toBe("1-2");
    expect(tonePattern("māma")).toBe("1-5");
  });
});

describe("pinyinMatches", () => {
  it("accepts marked, numbered and toneless input", () => {
    expect(pinyinMatches("jiānqiáng", "jiānqiáng")).toBe(true);
    expect(pinyinMatches("jian1 qiang2", "jiānqiáng")).toBe(true);
    expect(pinyinMatches("jian1qiang2", "jiānqiáng")).toBe(true);
    expect(pinyinMatches("jianqiang", "jiānqiáng")).toBe(true);
    expect(pinyinMatches("JianQiang", "jiānqiáng")).toBe(true);
  });
  it("rejects wrong tones when tones are given", () => {
    expect(pinyinMatches("jian3 qiang2", "jiānqiáng")).toBe(false);
    expect(pinyinMatches("jiǎnqiáng", "jiānqiáng")).toBe(false);
  });
  it("handles ü and neutral tone", () => {
    expect(pinyinMatches("nv3er2", "nǚ'ér")).toBe(true);
    expect(pinyinMatches("ma1 ma0", "māma")).toBe(true);
    expect(pinyinMatches("ma1ma", "māma")).toBe(true);
  });
  it("rejects wrong letters", () => {
    expect(pinyinMatches("jianqian", "jiānqiáng")).toBe(false);
    expect(pinyinMatches("", "jiānqiáng")).toBe(false);
  });
});

describe("containsHan", () => {
  it("detects Chinese characters", () => {
    expect(containsHan("坚强")).toBe(true);
    expect(containsHan("jianqiang")).toBe(false);
  });
});
