import type { PracticeMode } from "@/lib/lang/registry";

/** What is known on this device about how a deck is going. `null` = never done / not saved. */
export type ModeStats = {
  /** Share of the deck's words learned, 0-100 */
  learnPercent: number | null;
  /** Latest test score, 0-100 */
  testPercent: number | null;
  /** Best match time in ms */
  matchMs: number | null;
};

/**
 * The mode to point at with "Gợi ý cho bạn": learn the words first, then check them with a test, go back to
 * learning when the test went badly, and play match once both are fine.
 */
export function suggestMode(s: ModeStats): Extract<PracticeMode, "learn" | "test" | "match"> {
  if (s.learnPercent === null || s.learnPercent < 100) return "learn";
  if (s.testPercent === null) return "test";
  if (s.testPercent < 80) return "learn";
  return "match";
}
