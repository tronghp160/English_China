/**
 * What the word form does after the free lookup (browser cache → /api/lookup).
 * Dictionary first, AI in the background: the AI is only asked when the lookup
 * had no AI answer, and a context sentence always goes straight to the AI.
 */
export type LookupFound = "ai" | "cache" | "dict" | null;

export type NextStep =
  /** A full AI answer is already shown (shared or browser cache): nothing to ask. */
  | { kind: "done" }
  /** Show the dictionary answer (if any) and queue the word for an AI batch. */
  | { kind: "queue"; urgent: boolean }
  /** Show the dictionary answer and stop (no AI, or it was not asked for). */
  | { kind: "dict-only" }
  /** Nothing to show and no AI to ask. */
  | { kind: "error"; message: string }
  /** Context sentence: one direct /api/ai/enrich call, outside the batches and caches. */
  | { kind: "direct" };

export const NO_DICT_MESSAGE = "Từ điển miễn phí chưa có từ này. Bạn tự nhập nhé.";

export function decideNextStep(
  found: LookupFound,
  opts: {
    aiAvailable: boolean;
    /** Auto-suggest is on (setting "Tự gợi ý" and not editing a saved word). */
    auto: boolean;
    /** The user asked (button, leaving the field, "Dùng AI ngay"), not a typing pause. */
    urgent: boolean;
    hasContext: boolean;
  },
): NextStep {
  if (opts.hasContext && opts.aiAvailable) return { kind: "direct" };
  if (found === "ai" || found === "cache") return { kind: "done" };
  if (found === "dict") {
    return opts.aiAvailable && (opts.auto || opts.urgent) ? { kind: "queue", urgent: opts.urgent } : { kind: "dict-only" };
  }
  // The dictionary has nothing: the AI is the only answer, so it goes out at once.
  return opts.aiAvailable ? { kind: "queue", urgent: true } : { kind: "error", message: NO_DICT_MESSAGE };
}
