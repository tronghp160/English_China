import { describe, expect, it } from "vitest";
import { buildMatchBoards, formatMs, isPair } from "@/lib/practice/match";
import { seeded, word, words } from "./helpers/study-word";

describe("match boards", () => {
  it("splits words into boards of 6 pairs with every pair twice", () => {
    const list = words(18);
    const boards = buildMatchBoards(list, 6, seeded(1));
    expect(boards).toHaveLength(3);
    for (const b of boards) {
      expect(b).toHaveLength(12);
      const counts = new Map<string, string[]>();
      b.forEach((t) => counts.set(t.pairId, [...(counts.get(t.pairId) ?? []), t.side]));
      for (const sides of counts.values()) expect(sides.sort()).toEqual(["meaning", "term"]);
    }
    expect(new Set(boards.flat().map((t) => t.pairId)).size).toBe(18);
  });

  it("never puts the same meaning or term twice on a board", () => {
    const list = [
      word({ term: "big", meaning_vi: "to" }),
      word({ term: "large", meaning_vi: "To " }),
      word({ term: "Big", meaning_vi: "lớn" }),
      ...words(3),
    ];
    const boards = buildMatchBoards(list, 6, seeded(2));
    for (const b of boards) {
      const meanings = b.filter((t) => t.side === "meaning").map((t) => t.label.trim().toLowerCase());
      const terms = b.filter((t) => t.side === "term").map((t) => t.label.toLowerCase());
      expect(new Set(meanings).size).toBe(meanings.length);
      expect(new Set(terms).size).toBe(terms.length);
    }
    // 6 words but two clashes: one board of 4–5 pairs plus a second board (or a dropped single pair)
    expect(boards[0].length).toBeLessThan(12);
  });

  it("drops a final single-pair board", () => {
    const boards = buildMatchBoards(words(7), 6, seeded(3));
    expect(boards).toHaveLength(1);
    expect(boards[0]).toHaveLength(12);
  });

  it("is deterministic with a fixed rng", () => {
    const list = words(12);
    expect(buildMatchBoards(list, 6, seeded(9))).toEqual(buildMatchBoards(list, 6, seeded(9)));
  });

  it("isPair needs the same word on both sides", () => {
    const [b] = buildMatchBoards(words(2), 6, seeded(4));
    const t = b.find((x) => x.side === "term")!;
    const m = b.find((x) => x.side === "meaning" && x.pairId === t.pairId)!;
    const other = b.find((x) => x.side === "meaning" && x.pairId !== t.pairId)!;
    expect(isPair(t, m)).toBe(true);
    expect(isPair(m, t)).toBe(true);
    expect(isPair(t, other)).toBe(false);
    expect(isPair(t, t)).toBe(false);
  });

  it("formats times in Vietnamese", () => {
    expect(formatMs(12_340)).toBe("12,3 giây");
    expect(formatMs(65_200)).toBe("1 phút 05,2 giây");
    expect(formatMs(0)).toBe("0,0 giây");
  });
});
