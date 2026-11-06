import "server-only";
import type { LangCode } from "@/lib/lang/types";
import type { ServerSupabase } from "@/lib/supabase/server";

export type NewThread = {
  userId: string;
  language: LangCode;
  deckId?: string | null;
  title?: string | null;
};

const rowOf = (t: NewThread) => ({ user_id: t.userId, language: t.language, deck_id: t.deckId ?? null, title: t.title ?? null });

/**
 * Inserts a tutor thread through the user's RLS client (the insert policy only allows their own
 * user_id); the database picks the id. Used by the chat server actions.
 */
export function insertThread(supabase: ServerSupabase, t: NewThread) {
  return supabase.from("chat_threads").insert(rowOf(t)).select("id").single();
}

/**
 * Creates the thread with an id the client picked (the first question is sent without waiting for a
 * server action). A repeat is ignored instead of failing, so `data` holds the inserted row (one) or
 * nothing (the id already existed: a retried first question, or someone else's id). Callers build the
 * thread from what they inserted and read it back only after a conflict. Used by /api/chat.
 */
export function ensureThread(supabase: ServerSupabase, t: NewThread & { id: string }) {
  return supabase
    .from("chat_threads")
    .upsert({ id: t.id, ...rowOf(t) }, { onConflict: "id", ignoreDuplicates: true })
    .select("id");
}
