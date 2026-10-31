import type { ChatMessage } from "@/lib/ai/chat-tools";

/**
 * History as sent back to the model: older assistant turns keep only their text (tool results,
 * reasoning and step markers were for that turn and cost many input tokens); the last assistant
 * turn stays whole, so a running quiz or role-play still sees its latest tool result. Assistant
 * turns left without text are dropped. Pure.
 */
export function slimHistory(messages: ChatMessage[]): ChatMessage[] {
  let lastAssistant = -1;
  messages.forEach((m, i) => {
    if (m.role === "assistant") lastAssistant = i;
  });
  return messages
    .map((m, i) => (m.role !== "assistant" || i === lastAssistant ? m : { ...m, parts: m.parts.filter((p) => p.type === "text") }))
    .filter((m) => m.role !== "assistant" || m.parts.some((p) => p.type === "text" && p.text.trim()));
}
