import { z } from "zod";
import { CHAT_MAX_CHARS } from "@/lib/ai/chat-prompt";

/** The client sends at most this many of the latest messages (the conversation lives only in its browser). */
export const CLONE_MAX_MESSAGES = 20;
/** Longest stored answer the client may send back as history. */
export const CLONE_ASSISTANT_MAX_CHARS = 4000;
/** Cap on the whole request, so a long history cannot cost a lot per message. */
export const CLONE_TOTAL_MAX_CHARS = 30_000;

const message = z.object({
  id: z.string().min(1).max(64),
  role: z.enum(["user", "assistant"]),
  parts: z.array(z.object({ type: z.literal("text"), text: z.string() })).min(1).max(8),
});

const textOf = (m: z.infer<typeof message>) => m.parts.map((p) => p.text).join("\n");

/** Body of POST /api/clone: the latest messages (text only), the last one from the user. */
export const cloneBodySchema = z
  .object({ messages: z.array(message).min(1).max(CLONE_MAX_MESSAGES) })
  .superRefine(({ messages }, ctx) => {
    let total = 0;
    for (const [i, m] of messages.entries()) {
      const length = textOf(m).length;
      total += length;
      if (length > (m.role === "user" ? CHAT_MAX_CHARS : CLONE_ASSISTANT_MAX_CHARS)) {
        ctx.addIssue({ code: "custom", path: ["messages", i], message: "message too long" });
      }
    }
    if (total > CLONE_TOTAL_MAX_CHARS) ctx.addIssue({ code: "custom", path: ["messages"], message: "conversation too long" });
    const last = messages[messages.length - 1];
    // (an empty list already failed `.min(1)`, but refinements still run on it)
    if (last && (last.role !== "user" || !textOf(last).trim())) {
      ctx.addIssue({ code: "custom", path: ["messages", messages.length - 1], message: "the last message must be a non-empty user message" });
    }
  });

export type CloneBody = z.infer<typeof cloneBodySchema>;
export type CloneTurn = { role: "user" | "assistant"; content: string };

/**
 * Pure. What the model is given as the conversation: empty messages dropped, the latest 20 kept, consecutive messages
 * of one role joined (a user who sent several in a row), and no leading assistant message (a model conversation
 * starts with the user). The client is not trusted: this is only text, never an instruction channel.
 */
export function sanitizeCloneHistory(messages: CloneBody["messages"]): CloneTurn[] {
  const turns: CloneTurn[] = [];
  const nonEmpty = messages.map((m) => ({ role: m.role, content: textOf(m).trim() })).filter((m) => m.content);
  for (const m of nonEmpty.slice(-CLONE_MAX_MESSAGES)) {
    const prev = turns[turns.length - 1];
    if (prev && prev.role === m.role) prev.content += `\n\n${m.content}`;
    else turns.push({ ...m });
  }
  while (turns[0]?.role === "assistant") turns.shift();
  return turns;
}
