import "server-only";
import { cache } from "react";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Deck visible to the current user (RLS), plus what they may do with it. */
export const getDeck = cache(async (deckId: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(deckId)) return null;
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data: deck } = await supabase
    .from("decks")
    .select("*, owner:profiles!decks_owner_id_fkey(id, display_name, username), group:groups(id, name)")
    .eq("id", deckId)
    .maybeSingle();
  if (!deck) return null;
  const isOwner = deck.owner_id === user.id;
  let canEdit = isOwner;
  if (!canEdit && deck.visibility === "group" && deck.allow_member_edit) {
    const { data } = await supabase.rpc("can_edit_deck", { did: deckId });
    canEdit = Boolean(data);
  }
  const { data: sub } = await supabase
    .from("deck_subscriptions")
    .select("deck_id")
    .eq("deck_id", deckId)
    .eq("user_id", user.id)
    .maybeSingle();
  return { deck, isOwner, canEdit, isSubscribed: Boolean(sub) };
});

export type DeckView = NonNullable<Awaited<ReturnType<typeof getDeck>>>;

export const getMyDecks = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_decks");
  return data ?? [];
});

/**
 * The first word of each deck (oldest first), shown big on the deck cards. One cheap query per deck, run together;
 * decks without words are left out.
 */
export const getDeckSamples = cache(async (deckIds: string[]) => {
  const supabase = await createClient();
  const rows = await Promise.all(
    deckIds.map(async (id) => {
      const { data } = await supabase
        .from("words")
        .select("term")
        .eq("deck_id", id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return [id, data?.term] as const;
    }),
  );
  const out: Record<string, string> = {};
  for (const [id, term] of rows) if (term) out[id] = term;
  return out;
});
