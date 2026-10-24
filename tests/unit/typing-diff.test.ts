import { describe, expect, it } from "vitest";
import { diffChars, hintMask, maxHints } from "@/lib/practice/typing-diff";

const text = (cs: { ch: string }[]) => cs.map((c) => c.ch).join("");
const bad = (cs: { ch: string; ok: boolean }[]) => cs.filter((c) => !c.ok).map((c) => c.ch);

describe("diffChars", () => {
  it("marks everything ok for an exact answer, ignoring case", () => {
    const d = diffChars("Apple", "apple");
    expect(bad(d.typed)).toEqual([]);
    expect(bad(d.answer)).toEqual([]);
  });

  it("finds the slipped letter and the missing letter", () => {
    const d = diffChars("recieve", "receive");
    expect(text(d.typed)).toBe("recieve");
    // one of the swapped letters is wrong on each side
    expect(bad(d.typed)).toHaveLength(1);
    expect(bad(d.answer)).toHaveLength(1);
  });

  it("shows letters that were left out", () => {
    const d = diffChars("aple", "apple");
    expect(bad(d.typed)).toEqual([]);
    expect(bad(d.answer)).toEqual(["p"]);
  });

  it("shows extra letters on the typed side", () => {
    const d = diffChars("appple", "apple");
    expect(bad(d.typed)).toEqual(["p"]);
    expect(bad(d.answer)).toEqual([]);
  });

  it("copes with empty input", () => {
    expect(diffChars("", "cat").answer.every((c) => !c.ok)).toBe(true);
    expect(diffChars("cat", "").typed.every((c) => !c.ok)).toBe(true);
  });
});

describe("hintMask", () => {
  it("shows the first letters and hides the rest", () => {
    expect(hintMask("apple", 0)).toBe("_____");
    expect(hintMask("apple", 2)).toBe("ap___");
  });
  it("keeps spaces and does not count them", () => {
    expect(hintMask("ice cream", 1)).toBe("i__ _____");
  });
  it("works for Chinese characters", () => {
    expect(hintMask("米饭", 1, "□")).toBe("米□");
  });
});

describe("maxHints", () => {
  it("leaves at least one letter hidden", () => {
    expect(maxHints("apple")).toBe(4);
    expect(maxHints("ice cream")).toBe(7);
    expect(maxHints("a")).toBe(0);
  });
});
