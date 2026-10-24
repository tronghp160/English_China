import { describe, expect, it } from "vitest";
import { cardsToSave, findInnerDuplicates, isBlank, pasteToCards, saveLabel } from "@/lib/compose";
import { emptyWord, type WordInput } from "@/lib/word-schema";

describe("compose helpers", () => {
  it("isBlank identifies cards with empty term and meaning", () => {
    expect(isBlank(emptyWord())).toBe(true);
    expect(isBlank({ ...emptyWord(), term: "   " })).toBe(true);
    expect(isBlank({ ...emptyWord(), term: "apple" })).toBe(false);
    expect(isBlank({ ...emptyWord(), meaning_vi: "táo" })).toBe(false);
  });

  it("cardsToSave removes blank cards in the middle and at the end", () => {
    const cards: WordInput[] = [
      { ...emptyWord(), term: "first", meaning_vi: "đầu tiên" },
      emptyWord(), // middle blank
      { ...emptyWord(), term: "third", meaning_vi: "thứ ba" },
      emptyWord(), // trailing blank
    ];
    const toSave = cardsToSave(cards);
    expect(toSave).toHaveLength(2);
    expect(toSave[0]).toEqual({ index: 0, value: cards[0] });
    expect(toSave[1]).toEqual({ index: 2, value: cards[2] });
  });

  it("findInnerDuplicates detects case-insensitive and whitespace-insensitive duplicates", () => {
    const cards: WordInput[] = [
      { ...emptyWord(), term: "Resilient" },
      emptyWord(), // blank card should be ignored
      { ...emptyWord(), term: "different" },
      { ...emptyWord(), term: "resilient " },
    ];
    const dups = findInnerDuplicates(cards);
    expect(dups.has(3)).toBe(true);
    expect(dups.get(3)).toBe(0);
    expect(dups.has(0)).toBe(false);
    expect(dups.has(2)).toBe(false);
  });

  it("pasteToCards parses Chinese input into term, reading and meaning", () => {
    const res = pasteToCards("苹果 píngguǒ quả táo", "zh");
    expect(res.cards).toHaveLength(1);
    expect(res.cards[0].term).toBe("苹果");
    expect(res.cards[0].reading).toBe("píngguǒ");
    expect(res.cards[0].meaning_vi).toBe("quả táo");
    expect(res.errors).toHaveLength(0);
  });

  it("saveLabel generates correct button labels", () => {
    expect(saveLabel(0)).toBe("Lưu từ");
    expect(saveLabel(1)).toBe("Lưu từ");
    expect(saveLabel(3)).toBe("Lưu 3 từ");
    expect(saveLabel(10)).toBe("Lưu 10 từ");
  });
});
