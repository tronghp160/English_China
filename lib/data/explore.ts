import "server-only";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const EXPLORE_PAGE_SIZE = 30;

export type ExploreSort = "popular" | "new";

/** Public decks (RLS: readable by every signed-in user), with the caller's subscriptions. */
export async function getPublicDecks(opts: { lang: "en" | "zh" | null; q: string; sort: ExploreSort; page: number }) {
  const user = await getUser();
  const supabase = await createClient();
  const from = (opts.page - 1) * EXPLORE_PAGE_SIZE;

  let query = supabase
    .from("decks")
    .select(
      "id, name, description, language, word_count, learner_count, owner_id, owner:profiles!decks_owner_id_fkey(display_name)",
      { count: "exact" },
    )
    .eq("visibility", "public")
    .gt("word_count", 0);
  if (opts.lang) query = query.eq("language", opts.lang);
  if (opts.q) query = query.ilike("name", `%${opts.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
  query =
    opts.sort === "new"
      ? query.order("created_at", { ascending: false })
      : query.order("learner_count", { ascending: false }).order("word_count", { ascending: false });
  const { data, count } = await query.order("id").range(from, from + EXPLORE_PAGE_SIZE - 1);

  const ids = (data ?? []).map((d) => d.id);
  let subscribed = new Set<string>();
  if (user && ids.length) {
    const { data: subs } = await supabase.from("deck_subscriptions").select("deck_id").in("deck_id", ids);
    subscribed = new Set((subs ?? []).map((s) => s.deck_id));
  }

  return {
    total: count ?? 0,
    decks: (data ?? []).map((d) => ({
      ...d,
      isMine: d.owner_id === user?.id,
      isSubscribed: subscribed.has(d.id),
    })),
  };
}
