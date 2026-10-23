import { describe, expect, expectTypeOf, it } from "vitest";
import { REVIEW_MODES, type ReviewMode } from "@/lib/lang/registry";
import { buildQuestions, countsFor, reviewModeOf } from "@/lib/practice/questions";
import type { Enums } from "@/lib/supabase/database.types";
import { seeded, word, words } from "./helpers/study-word";

describe("review modes", () => {
  it("match the Postgres enum", () => {
    expectTypeOf<ReviewMode>().toEqualTypeOf<Enums<"review_mode">>();
    expect(REVIEW_MODES).toHaveLength(7);
  });

  it("reviewModeOf maps every question kind to a stored mode", () => {
    const pool = words(5);
    const rng = seeded(3);
    for (const mode of REVIEW_MODES) {
      const targets = mode === "writing" ? [word({ term: "坚强", language: "zh" })] : pool;
      const [q] = buildQuestions(mode, targets, pool, rng);
      if (mode === "cloze" || mode === "tones") continue; // these words have no example / pinyin
      expect(reviewModeOf(q)).toBe(mode);
    }
  });
});

describe("countsFor", () => {
  it("offers set sizes per mode", () => {
    expect(countsFor("flashcard")).toEqual([20, 50, 200]);
    expect(countsFor("match")).toEqual([6, 12, 18]);
    expect(countsFor("learn")).toEqual([10, 20, 50]);
    expect(countsFor("test")).toEqual([10, 20, 30]);
    expect(countsFor("quiz")).toEqual([10, 20, 30]);
  });
});
