import { describe, expect, it } from "vitest";
import { lang } from "@/lib/lang/registry";
import { FRIEND_DECKS, SAMPLE_DECKS, sampleWordRows } from "@/lib/sample-data";
import { wordInputSchema } from "@/lib/word-schema";

describe("sample decks", () => {
  for (const deck of [...SAMPLE_DECKS, ...FRIEND_DECKS]) {
    it(`${deck.key}: rows match the app's normalization and word schema`, () => {
      const rows = sampleWordRows(deck);
      expect(rows.length).toBeGreaterThan(5);
      expect(new Set(rows.map((r) => r.normalized)).size).toBe(rows.length);
      for (const row of rows) {
        const def = lang(deck.language);
        expect(row.normalized).toBe(def.normalize(row.term));
        expect(row.reading_key).toBe(def.readingKey(row.reading));
        expect(wordInputSchema.safeParse(row).success, row.term).toBe(true);
      }
    });
  }
});
