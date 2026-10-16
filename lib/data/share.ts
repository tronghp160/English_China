import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

export const SHARE_PREVIEW_LIMIT = 300;

/**
 * Deck behind a share link. The link itself is the permission, so this reads
 * with the service role (a link-shared private deck is not readable under RLS
 * before subscribing). Only public columns are returned.
 */
export const getSharedDeck = cache(async (slug: string) => {
  if (!/^[a-z0-9]{6,32}$/.test(slug)) return null;
  const admin = createAdminClient();
  const { data: deck } = await admin
    .from("decks")
    .select(
      "id, name, description, language, word_count, learner_count, owner_id, owner:profiles!decks_owner_id_fkey(display_name)",
    )
    .eq("share_slug", slug)
    .maybeSingle();
  if (!deck) return null;
  const { data: words } = await admin
    .from("words")
    .select("id, term, reading, meaning_vi, emoji")
    .eq("deck_id", deck.id)
    .order("created_at")
    .limit(SHARE_PREVIEW_LIMIT);
  return { deck, words: words ?? [] };
});
