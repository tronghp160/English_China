import { describe, expect, it } from "vitest";
import { parsePagePath, WORD_CONTEXT_MAX, wordContextLine } from "@/lib/ai/tutor/page-context";

describe("parsePagePath", () => {
  const validUuid = "123e4567-e89b-12d3-a456-426614174000";

  it("identifies a word page with valid uuid", () => {
    expect(parsePagePath(`/words/${validUuid}`)).toEqual({
      kind: "word",
      id: validUuid,
    });
  });

  it("identifies a word edit page as word", () => {
    expect(parsePagePath(`/words/${validUuid}/edit`)).toEqual({
      kind: "word",
      id: validUuid,
    });
  });

  it("rejects word pages with invalid uuid as other", () => {
    expect(parsePagePath("/words/not-a-uuid")).toEqual({ kind: "other" });
    expect(parsePagePath("/words/123/edit")).toEqual({ kind: "other" });
  });

  it("identifies a deck page with valid uuid", () => {
    expect(parsePagePath(`/decks/${validUuid}`)).toEqual({
      kind: "deck",
      id: validUuid,
    });
  });

  it("rejects deck page with invalid uuid", () => {
    expect(parsePagePath("/decks/abc")).toEqual({ kind: "other" });
    expect(parsePagePath("/decks")).toEqual({ kind: "other" });
  });

  it("identifies practice, review, and test pages", () => {
    expect(parsePagePath("/review")).toEqual({ kind: "practice" });
    expect(parsePagePath("/practice/flashcards")).toEqual({ kind: "practice" });
    expect(parsePagePath("/practice/match")).toEqual({ kind: "practice" });
    expect(parsePagePath("/test")).toEqual({ kind: "practice" });
    expect(parsePagePath("/test/quick")).toEqual({ kind: "practice" });
  });

  it("classifies other paths as other", () => {
    expect(parsePagePath("/")).toEqual({ kind: "other" });
    expect(parsePagePath("/today")).toEqual({ kind: "other" });
    expect(parsePagePath("/chat")).toEqual({ kind: "other" });
    expect(parsePagePath("/settings")).toEqual({ kind: "other" });
  });
});

describe("wordContextLine", () => {
  it("adds part of speech, two examples and the learner's note", () => {
    const line = wordContextLine({
      term: "坚强",
      reading: "jiānqiáng",
      meaning_vi: "kiên cường",
      parts_of_speech: ["adj"],
      examples: [
        { text: "她很坚强。", reading: null, vi: "Cô ấy rất kiên cường." },
        { text: "坚强的意志", reading: null, vi: "ý chí kiên cường" },
        { text: "third", reading: null, vi: "thứ ba" },
      ],
      personal_note: "  nhớ:  kiên = 坚 ",
    });
    expect(line).toContain("坚强 (jiānqiáng) [adj]: kiên cường");
    expect(line).toContain("她很坚强。 = Cô ấy rất kiên cường.; 坚强的意志 = ý chí kiên cường");
    expect(line).not.toContain("third");
    expect(line).toContain("Ghi chú của người học: nhớ: kiên = 坚");
  });

  it("stays short and copes with odd stored examples", () => {
    expect(wordContextLine({ term: "a", reading: null, meaning_vi: "b", examples: "nope" })).toBe('Người học đang xem từ a: b. "Từ này" nghĩa là từ đó.');
    const long = wordContextLine({ term: "a", reading: null, meaning_vi: "b", personal_note: "x".repeat(1000) });
    expect(long.length).toBe(WORD_CONTEXT_MAX);
  });
});
