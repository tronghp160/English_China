import { parseImport, type ParsedLine } from "@/lib/import-parser";
import type { LangCode } from "@/lib/lang/types";
import { textKey } from "@/lib/practice";
import { emptyWord, type WordInput } from "@/lib/word-schema";

export const MAX_CARDS = 100;

/**
 * Returns true if both `term` and `meaning_vi` are empty after trimming.
 */
export function isBlank(c: WordInput): boolean {
  return !(c.term?.trim()) && !(c.meaning_vi?.trim());
}

/**
 * Filters out blank cards while preserving their original indices.
 */
export function cardsToSave(cards: WordInput[]): { index: number; value: WordInput }[] {
  const result: { index: number; value: WordInput }[] = [];
  cards.forEach((card, index) => {
    if (!isBlank(card)) {
      result.push({ index, value: card });
    }
  });
  return result;
}

/**
 * Finds duplicates across the cards using the case/whitespace-insensitive `textKey`.
 * Returns a map from subsequent duplicate card index to the first card index with the same term.
 */
export function findInnerDuplicates(cards: WordInput[]): Map<number, number> {
  const map = new Map<number, number>();
  const seen = new Map<string, number>();
  cards.forEach((card, i) => {
    const raw = card.term?.trim();
    if (!raw) return;
    const key = textKey(raw);
    const first = seen.get(key);
    if (first !== undefined) {
      map.set(i, first);
    } else {
      seen.set(key, i);
    }
  });
  return map;
}

/**
 * Wraps `parseImport` to convert lines into word card inputs.
 */
export function pasteToCards(
  text: string,
  language: LangCode,
): { cards: WordInput[]; errors: ParsedLine[] } {
  const parsed = parseImport(text, language, []);
  const cards: WordInput[] = parsed.ok.map((line) => ({
    ...emptyWord(),
    term: line.term,
    meaning_vi: line.meaning_vi ?? "",
    reading: line.reading ?? "",
  }));
  return {
    cards,
    errors: parsed.lines.filter((l) => l.status !== "ok"),
  };
}

/**
 * Returns the action button label based on the count of valid cards.
 */
export function saveLabel(validCount: number): string {
  if (validCount <= 1) return "Lưu từ";
  return `Lưu ${validCount} từ`;
}
