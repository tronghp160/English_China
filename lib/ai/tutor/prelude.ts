import "server-only";
import { CHAT_HISTORY_LIMIT } from "@/lib/ai/chat-prompt";
import { aiGate } from "@/lib/ai/gate";
import { learnerSnapshot, type LangSnapshot } from "@/lib/ai/tutor/learner";
import { pageContextLine } from "@/lib/ai/tutor/page-context";
import { snapshotCache as defaultCache, type SnapshotCache } from "@/lib/ai/tutor/snapshot-cache";
import type { tutorTimer } from "@/lib/ai/tutor/timing";
import { loadMe, type SessionUser } from "@/lib/auth";
import { LANGUAGES } from "@/lib/lang/registry";
import type { LangCode } from "@/lib/lang/types";
import type { ServerSupabase } from "@/lib/supabase/server";

/** Both languages, so the snapshot does not wait for the learner's settings (a language with no cards is dropped later). */
const SNAPSHOT_LANGUAGES = Object.keys(LANGUAGES) as LangCode[];

export const readThread = (supabase: ServerSupabase, threadId: string) =>
  supabase.from("chat_threads").select("id, language, deck_id, title, deck:decks(name, language)").eq("id", threadId).maybeSingle();

export type ThreadRow = NonNullable<Awaited<ReturnType<typeof readThread>>["data"]>;

const readHistory = (supabase: ServerSupabase, threadId: string) =>
  supabase
    .from("chat_messages")
    .select("id, role, parts")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(CHAT_HISTORY_LIMIT);

const readDeck = (supabase: ServerSupabase, deckId: string) =>
  supabase.from("decks").select("name, language").eq("id", deckId).maybeSingle();

export type PreludeArgs = {
  supabase: ServerSupabase;
  /** From `getUser()` (verified from the JWT, no network). */
  user: SessionUser;
  threadId: string;
  /** Set on the first message of a conversation the client opened itself. */
  newThread?: { deckId?: string | null };
  /** Page the learner is on (page context for the tutor). */
  contextPath?: string;
  timer: ReturnType<typeof tutorTimer>;
  /** Injectable for tests. */
  cache?: SnapshotCache;
};

/**
 * Starts every read /api/chat needs before it can call the model, all at once, so the wait is one round
 * to Supabase (the slowest read) instead of one round after another:
 *   me (profile + settings), the thread, rate limit + quota (one request), the stored history, the learner snapshot,
 *   the page context and, for a new conversation on a deck, that deck's name.
 * Nothing here waits for another read: the snapshot no longer needs the learner's study languages,
 * and the thread is read by id. The caller awaits the returned promises together and then applies the
 * checks in the usual order (401, 404, rate limit, quota). Marks `auth`, `limits` and `context` are set
 * when each part finishes (milliseconds since the request started, not per-step times).
 */
export function startPrelude({ supabase, user, threadId, newThread, contextPath, timer, cache = defaultCache }: PreludeArgs) {
  const tap =
    (name: string) =>
    <T>(value: T): T => {
      timer.mark(name);
      return value;
    };

  const me = loadMe(user).then(tap("auth"));

  // One request for the rate limit and the quota (aiGate); the unit is recorded only once an answer was written (onEnd).
  // A quota failure is returned as a value, so the caller can still answer 404 first.
  const gate = Promise.all([
    readThread(supabase, threadId),
    aiGate(user.id, "chat", 12, 60).then(
      (g) => ({ allowed: g.allowed, quotaError: null as unknown }),
      (e: unknown) => ({ allowed: true, quotaError: e ?? new Error("aiGate failed") }),
    ),
  ]).then(([thread, g]) => tap("limits")([thread, g.allowed, g.quotaError] as const));

  const deck = newThread?.deckId ? readDeck(supabase, newThread.deckId).then((r) => r.data) : Promise.resolve(null);

  // A follow-up message may reuse the snapshot of the last two minutes; the first message always reads fresh.
  const cached = newThread ? undefined : cache.get(user.id);
  const freshSnapshot = async (): Promise<LangSnapshot[]> => {
    const snapshot = await learnerSnapshot(supabase, SNAPSHOT_LANGUAGES);
    if (snapshot.length) cache.set(user.id, snapshot); // [] means the read failed: do not remember that
    return snapshot;
  };

  const context = Promise.all([
    readHistory(supabase, threadId),
    cached ? Promise.resolve(cached) : freshSnapshot(),
    contextPath ? pageContextLine(supabase, contextPath) : Promise.resolve(null),
  ]).then(tap("context"));

  return { me, gate, deck, context, usedCachedSnapshot: cached !== undefined, freshSnapshot };
}
