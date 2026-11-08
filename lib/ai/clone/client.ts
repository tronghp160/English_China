import type { UIMessage } from "ai";
import { CLONE_MAX_MESSAGES } from "@/lib/ai/clone/history";

/**
 * Browser side of the "bản AI" chat. The browser keeps nothing: the conversation lives in React state while the page
 * is open (use-clone-chat.ts), each request carries the latest messages and the server stores them (app/api/clone).
 * The notice card is shown at the start of every conversation, so there is no "closed" flag either.
 * No server-only imports.
 */

/** Keys an earlier version used to keep conversations in localStorage (one per user): deleted when the page opens. */
export const LEGACY_CLONE_STORAGE_PREFIX = "sotu:clone:v1:";

/** The flag an earlier version set when the first-visit card was closed (the card is always shown now): deleted too. */
export const LEGACY_CLONE_INTRO_KEY = "sotu:clone:intro:v1";

/**
 * Deletes everything an earlier version left in a Storage: the conversations ("sotu:clone:v1:*") and the "card closed"
 * flag, and nothing else (every other key stays). Returns how many keys it removed.
 */
export function clearLegacyCloneStorage(storage: Pick<Storage, "length" | "key" | "removeItem">): number {
  const stale: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && (key.startsWith(LEGACY_CLONE_STORAGE_PREFIX) || key === LEGACY_CLONE_INTRO_KEY)) stale.push(key);
  }
  for (const key of stale) storage.removeItem(key);
  return stale.length;
}

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

/**
 * Pure. The name to greet a person by: the last word of their display name, which is the given name in Vietnamese order
 * ("Nguyễn Văn Minh" → "Minh"); a one-word name stays as it is. A display name that looks like a username or an email
 * (the word has a digit, "@", "_" or ".") is not a name: null, and the greeting says only "Hello nha".
 */
export function greetingName(displayName: string): string | null {
  const word = displayName
    .replace(/[<>]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .at(-1)
    ?.replace(/[,;:!?]+$/u, "");
  if (!word || word.length > 30 || /[\d@_.]/.test(word)) return null;
  return word;
}

let lastWarm = 0;
/** Pings GET /api/clone when the page opens or the box is focused, so the first message does not pay for a cold function (once per 4 minutes). */
export function warmClone() {
  if (Date.now() - lastWarm < 240_000) return;
  lastWarm = Date.now();
  void fetch("/api/clone", { method: "GET", cache: "no-store", keepalive: true }).catch(() => {});
}

/**
 * Suggestions on the empty screen. They are about the person, not about the owner: this is a place to talk about
 * yourself, so every chip starts a conversation where they share (no profile details: they are public code).
 */
export const CLONE_STARTERS = [
  "Nay tui có chuyện muốn kể…",
  "Tui có tin vui muốn khoe nè!",
  "Tui đang buồn, nghe tui than chút nha",
  "Dạo này tui áp lực quá",
  "Tui đang rối, không biết nên làm sao",
  "Tui chỉ muốn có người nói chuyện thôi",
] as const;
