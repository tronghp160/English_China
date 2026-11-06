import type { LangCode } from "@/lib/lang/types";

const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"];

/** Fewer leveled words than this say too little about the learner: no estimate. */
export const MIN_LEVELED_WORDS = 3;

/** "B1" -> 3, "HSK 4" -> 4; null for anything else. */
function ordinal(language: LangCode, label: string): number | null {
  if (language === "en") {
    const i = CEFR.indexOf(label.trim().toUpperCase());
    return i < 0 ? null : i + 1;
  }
  const m = /^HSK\s*(\d)$/i.exec(label.trim());
  return m ? Number(m[1]) : null;
}

/**
 * Pure. A learner's level in one language from the level labels of the words they study (`levelOf`: "A2", "HSK 3"):
 * the most common level, or when several levels are equally common the middle one (lower middle for an even count).
 * Null with fewer than MIN_LEVELED_WORDS leveled words or labels it does not know.
 */
export function estimateLevel(language: LangCode, labels: (string | null | undefined)[]): string | null {
  const values = labels
    .map((l) => (l ? ordinal(language, l) : null))
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b);
  if (values.length < MIN_LEVELED_WORDS) return null;

  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const top = Math.max(...counts.values());
  const modes = [...counts].filter(([, c]) => c === top).map(([v]) => v);
  const level = modes.length === 1 ? modes[0] : values[Math.floor((values.length - 1) / 2)];
  return language === "en" ? CEFR[level - 1] : `HSK ${level}`;
}
