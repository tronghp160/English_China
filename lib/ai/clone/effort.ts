import { detectMood, isNegativeMood } from "@/lib/ai/clone/mood";
import type { TutorEffort } from "@/lib/ai/tutor/effort";

/**
 * Pure. Thinking delays the first word, and a friendly reply rarely needs it, so the companion answers on
 * "minimal"; a long message or one about feeling low, worried, angry or worse gets "low" (to read it with more care).
 */
export function cloneEffort(lastUserText: string): TutorEffort {
  if (lastUserText.length > 220) return "low";
  return isNegativeMood(detectMood(lastUserText)) ? "low" : "minimal";
}
