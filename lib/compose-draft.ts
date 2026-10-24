import { isBlank } from "@/lib/compose";
import { emptyWord, wordInputSchema, type WordInput } from "@/lib/word-schema";

export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function draftKey(userId: string, deckId: string): string {
  return `sotu-compose:${userId}:${deckId}`;
}

export type ComposeDraft = {
  v: 1;
  savedAt: number;
  cards: WordInput[];
};

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function getStorage(custom?: StorageLike): StorageLike | undefined {
  if (custom) return custom;
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof globalThis !== "undefined" && (globalThis as unknown as { localStorage?: StorageLike }).localStorage) {
    return (globalThis as unknown as { localStorage: StorageLike }).localStorage;
  }
  return undefined;
}

export function saveDraft(
  userId: string,
  deckId: string,
  cards: WordInput[],
  storage?: StorageLike,
): void {
  const s = getStorage(storage);
  if (!s) return;
  try {
    const key = draftKey(userId, deckId);
    const hasNonBlank = cards.some((c) => !isBlank(c));
    if (!hasNonBlank) {
      s.removeItem(key);
      return;
    }
    const payload: ComposeDraft = {
      v: 1,
      savedAt: Date.now(),
      cards,
    };
    s.setItem(key, JSON.stringify(payload));
  } catch {}
}

export function loadDraft(
  userId: string,
  deckId: string,
  now: number = Date.now(),
  storage?: StorageLike,
): WordInput[] | null {
  const s = getStorage(storage);
  if (!s) return null;
  try {
    const key = draftKey(userId, deckId);
    const raw = s.getItem(key);
    if (!raw) return null;

    const data = JSON.parse(raw) as ComposeDraft;
    if (data?.v !== 1 || !Array.isArray(data.cards) || typeof data.savedAt !== "number") {
      s.removeItem(key);
      return null;
    }

    if (now - data.savedAt > DRAFT_TTL_MS) {
      s.removeItem(key);
      return null;
    }

    const validCards: WordInput[] = [];
    for (const c of data.cards) {
      const parsed = wordInputSchema.partial().safeParse(c);
      if (!parsed.success) {
        s.removeItem(key);
        return null;
      }
      validCards.push({ ...emptyWord(), ...parsed.data });
    }

    return validCards.length > 0 ? validCards : null;
  } catch {
    return null;
  }
}

export function clearDraft(userId: string, deckId: string, storage?: StorageLike): void {
  const s = getStorage(storage);
  if (!s) return;
  try {
    s.removeItem(draftKey(userId, deckId));
  } catch {}
}

/**
 * Merges an initial query term into the card list.
 * If list has only 1 blank card, replaces it. Otherwise appends a new card at the end.
 */
export function applyInitialTerm(cards: WordInput[], initialTerm?: string): WordInput[] {
  const term = initialTerm?.trim();
  if (!term) return cards.length > 0 ? cards : [emptyWord()];

  if (cards.length === 1 && isBlank(cards[0])) {
    return [{ ...cards[0], term }];
  }

  return [...cards, { ...emptyWord(), term }];
}
