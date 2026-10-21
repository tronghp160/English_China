import "server-only";
import { pinyinSearchKey } from "@/lib/lang/zh";
import type { LangCode } from "@/lib/lang/types";
import type { ServerSupabase } from "@/lib/supabase/server";

/** PostgREST filter syntax uses , ( ) and ilike wildcards; keep only plain search text. */
export function sanitizeSearch(q: string) {
  return q.replace(/[%_,()*\\"]/g, " ").replace(/\s+/g, " ").trim();
}

export type FoundWord = {
  id: string;
  term: string;
  reading: string | null;
  meaning_vi: string;
  language: LangCode;
  deck_id: string;
  deck: string;
};

/** Exact match, then prefix, then the rest (stable). */
export function rankByTerm<T extends { term: string }>(rows: T[], q: string) {
  const needle = q.toLowerCase();
  const score = (t: string) => (t.toLowerCase() === needle ? 0 : t.toLowerCase().startsWith(needle) ? 1 : 2);
  return rows.map((r, i) => ({ r, i, s: score(r.term) })).sort((a, b) => a.s - b.s || a.i - b.i).map((x) => x.r);
}

/**
 * Words in the decks the user studies whose term, Vietnamese meaning or toneless
 * pinyin contains the query. Reads with the user's client, so RLS applies.
 */
export async function searchMyWords(
  supabase: ServerSupabase,
  query: string,
  opts: { language?: LangCode; limit?: number } = {},
): Promise<{ words: FoundWord[]; decks: { id: string; name: string; language: LangCode }[] }> {
  const q = sanitizeSearch(query);
  const { data } = await supabase.rpc("my_decks");
  const decks = (data ?? []).filter((d) => !opts.language || d.language === opts.language);
  if (!q || !decks.length) return { words: [], decks: [] };
  const names = new Map(decks.map((d) => [d.id, d.name]));

  const filters = [`term.ilike.%${q}%`, `meaning_vi.ilike.%${q}%`];
  const key = pinyinSearchKey(q);
  if (key.length >= 2) filters.push(`reading_key.ilike.%${key}%`);
  const { data: rows } = await supabase
    .from("words")
    .select("id, term, reading, meaning_vi, language, deck_id")
    .in("deck_id", [...names.keys()])
    .or(filters.join(","))
    .limit(opts.limit ?? 12);

  const needle = q.toLowerCase();
  return {
    words: rankByTerm(
      (rows ?? []).map((w) => ({ ...w, deck: names.get(w.deck_id) ?? "" })),
      q,
    ),
    decks: decks
      .filter((d) => d.name.toLowerCase().includes(needle))
      .slice(0, 5)
      .map((d) => ({ id: d.id, name: d.name, language: d.language })),
  };
}
