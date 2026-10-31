import "server-only";
import type { LangCode } from "@/lib/lang/types";
import type { ServerSupabase } from "@/lib/supabase/server";

export type NewThread = {
  userId: string;
  language: LangCode;
  deckId?: string | null;
  title?: string | null;
  /** Chosen by the client (the first question is sent without waiting for a server action). */
  id?: string;
};

/**
 * Inserts a tutor thread through the user's RLS client (the insert policy only allows their own
 * user_id). With a client id, a repeat (a retried first question) is ignored instead of failing,
 * so read the thread back afterwards. Shared by the chat actions and /api/chat.
 */
export function insertThread(supabase: ServerSupabase, t: NewThread) {
  const row = { user_id: t.userId, language: t.language, deck_id: t.deckId ?? null, title: t.title ?? null };
  if (!t.id) return supabase.from("chat_threads").insert(row).select("id").single();
  return supabase.from("chat_threads").upsert({ id: t.id, ...row }, { onConflict: "id", ignoreDuplicates: true });
}
