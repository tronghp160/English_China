import type { UIMessage } from "ai";
import { z } from "zod";
import { CLONE_MAX_MESSAGES } from "@/lib/ai/clone/history";

/**
 * Browser side of the "bản AI" chat. The conversation exists only here (localStorage of the person chatting);
 * the server stores nothing and each request carries the latest messages. No server-only imports.
 */

/** Messages kept in localStorage. */
export const CLONE_STORED_MAX = 100;

export const cloneStorageKey = (userId: string) => `sotu:clone:v1:${userId}`;
export const CLONE_INTRO_KEY = "sotu:clone:intro:v1";

const textOf = (m: UIMessage) =>
  m.parts
    .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("\n")
    .trim();

/** Pure. Text-only messages with text, in order. */
export function textMessages(messages: UIMessage[]) {
  return messages.map((m) => ({ id: m.id, role: m.role, text: textOf(m) })).filter((m) => m.text && (m.role === "user" || m.role === "assistant"));
}

/** Pure. The request body: the latest messages as text parts only, as /api/clone expects. */
export function toRequestMessages(messages: UIMessage[]) {
  return textMessages(messages)
    .slice(-CLONE_MAX_MESSAGES)
    .map((m) => ({ id: m.id, role: m.role, parts: [{ type: "text" as const, text: m.text }] }));
}

const storedSchema = z.array(
  z.object({
    id: z.string().min(1).max(64),
    role: z.enum(["user", "assistant"]),
    text: z.string().min(1).max(8000),
  }),
);
export type StoredMessage = z.infer<typeof storedSchema>[number];

/** Pure. What goes into localStorage: the latest CLONE_STORED_MAX messages that have text. */
export function serializeMessages(messages: UIMessage[]): string {
  return JSON.stringify(textMessages(messages).slice(-CLONE_STORED_MAX));
}

/** Pure. Reads localStorage back; anything unreadable or not shaped like a conversation gives an empty one. */
export function parseStored(raw: string | null): UIMessage[] {
  if (!raw) return [];
  try {
    const parsed = storedSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return [];
    return parsed.data.slice(-CLONE_STORED_MAX).map((m) => ({ id: m.id, role: m.role, parts: [{ type: "text" as const, text: m.text }] }));
  } catch {
    return [];
  }
}

let lastWarm = 0;
/** Pings GET /api/clone when the page opens or the box is focused, so the first message does not pay for a cold function (once per 4 minutes). */
export function warmClone() {
  if (Date.now() - lastWarm < 240_000) return;
  lastWarm = Date.now();
  void fetch("/api/clone", { method: "GET", cache: "no-store", keepalive: true }).catch(() => {});
}

/** Suggestions on the empty screen (no profile details: they are public code). */
export const CLONE_STARTERS = [
  "Dạo này ông sao rồi?",
  "Ông thích làm gì lúc rảnh?",
  "Dạo này ông có gì vui không?",
  "Nay tui hơi buồn…",
  "Kể tui nghe một chuyện vui đi",
] as const;
