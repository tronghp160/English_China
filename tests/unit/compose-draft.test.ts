import { beforeEach, describe, expect, it } from "vitest";
import {
  applyInitialTerm,
  clearDraft,
  DRAFT_TTL_MS,
  draftKey,
  loadDraft,
  saveDraft,
  type StorageLike,
} from "@/lib/compose-draft";
import { emptyWord, type WordInput } from "@/lib/word-schema";

describe("compose draft helpers", () => {
  const userId = "user-123";
  const deckId = "deck-456";

  let map: Map<string, string>;
  let mockStorage: StorageLike;

  beforeEach(() => {
    map = new Map();
    mockStorage = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    };
    (globalThis as unknown as { localStorage: StorageLike }).localStorage = mockStorage;
  });

  it("formats draft key properly", () => {
    expect(draftKey(userId, deckId)).toBe("sotu-compose:user-123:deck-456");
  });

  it("saves and loads draft", () => {
    const cards: WordInput[] = [
      { ...emptyWord(), term: "resilient", meaning_vi: "kiên cường" },
    ];
    saveDraft(userId, deckId, cards);

    const loaded = loadDraft(userId, deckId);
    expect(loaded).toHaveLength(1);
    expect(loaded?.[0].term).toBe("resilient");
    expect(loaded?.[0].meaning_vi).toBe("kiên cường");
  });

  it("removes draft when all cards are blank", () => {
    const cards: WordInput[] = [{ ...emptyWord(), term: "apple", meaning_vi: "táo" }];
    saveDraft(userId, deckId, cards);
    expect(loadDraft(userId, deckId)).not.toBeNull();

    saveDraft(userId, deckId, [emptyWord()]);
    expect(loadDraft(userId, deckId)).toBeNull();
  });

  it("discards draft older than 7 days", () => {
    const cards: WordInput[] = [{ ...emptyWord(), term: "old", meaning_vi: "cũ" }];
    saveDraft(userId, deckId, cards);

    const now = Date.now();
    const future = now + DRAFT_TTL_MS + 1000;
    const loaded = loadDraft(userId, deckId, future);
    expect(loaded).toBeNull();
  });

  it("clears draft with clearDraft", () => {
    saveDraft(userId, deckId, [{ ...emptyWord(), term: "test", meaning_vi: "thử" }]);
    expect(loadDraft(userId, deckId)).not.toBeNull();

    clearDraft(userId, deckId);
    expect(loadDraft(userId, deckId)).toBeNull();
  });

  it("applyInitialTerm handles empty and populated lists", () => {
    const cards1: WordInput[] = [emptyWord()];
    const result1 = applyInitialTerm(cards1, "resilient");
    expect(result1).toHaveLength(1);
    expect(result1[0].term).toBe("resilient");

    const cards2: WordInput[] = [{ ...emptyWord(), term: "apple", meaning_vi: "táo" }];
    const result2 = applyInitialTerm(cards2, "banana");
    expect(result2).toHaveLength(2);
    expect(result2[0].term).toBe("apple");
    expect(result2[1].term).toBe("banana");
  });
});
