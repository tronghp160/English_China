import type { TutorEffort } from "@/lib/ai/tutor/effort";

// Words of a low mood or a heavy topic (a keyword must stand alone: "lo" is not "loại").
const HEAVY = /(?<![\p{L}])(buồn|chán|mệt|khóc|áp lực|stress|cô đơn|tủi|sợ|lo|thất tình|chia tay|muốn chết|tự tử)(?![\p{L}])/iu;

/**
 * Pure. Thinking delays the first word, and a friendly reply rarely needs it, so the companion answers on
 * "minimal"; a long message or one about feeling low gets "low" (to read it with more care).
 */
export function cloneEffort(lastUserText: string): TutorEffort {
  if (lastUserText.length > 220) return "low";
  return HEAVY.test(lastUserText) ? "low" : "minimal";
}
