import { describe, expect, it } from "vitest";
import { parsePagePath } from "@/lib/ai/tutor/page-context";

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
