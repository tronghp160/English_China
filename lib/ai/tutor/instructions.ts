import type { TutorInstructions } from "@/lib/ai/tutor/answer";
import type { AiProvider } from "@/lib/env";

/**
 * The stable part first, so providers can reuse it from their prompt cache: Gemini does that on its own for a
 * repeated prefix; Anthropic needs the marker on the stable system message. Shared by /api/chat and /api/clone.
 */
export function toInstructions(provider: AiProvider, parts: { stable: string; turn: string }): TutorInstructions {
  return provider.provider === "anthropic"
    ? [
        { role: "system", content: parts.stable, providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } } },
        { role: "system", content: parts.turn },
      ]
    : `${parts.stable}\n\n${parts.turn}`;
}
