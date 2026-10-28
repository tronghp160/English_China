import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toCsv } from "@/lib/csv";
import type { Database, Tables } from "@/lib/supabase/database.types";
import { examplesOf, extraOf } from "@/lib/word-mapper";

type Client = SupabaseClient<Database>;
type Word = Tables<"words">;

export const WORD_CSV_HEADER = [
  "term",
  "reading",
  "meaning_vi",
  "meaning_en",
  "parts_of_speech",
  "topic",
  "example",
  "example_vi",
  "synonyms",
  "antonyms",
  "han_viet",
  "level",
  "note",
];

export function wordCsvRow(w: Word): unknown[] {
  const ex = examplesOf(w)[0];
  const extra = extraOf(w);
  return [
    w.term,
    w.reading,
    w.meaning_vi,
    w.meaning_en,
    w.parts_of_speech,
    w.topic,
    ex?.text,
    ex?.vi,
    w.synonyms,
    w.antonyms,
    extra.han_viet ?? "",
    extra.cefr ?? (extra.hsk?.level ? `HSK ${extra.hsk.level}` : ""),
    w.personal_note,
  ];
}

/** Pages through a PostgREST query 1000 rows at a time (the API's max page size). */
export async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

export function deckWords(supabase: Client, deckIds: string[]) {
  if (!deckIds.length) return Promise.resolve([] as Word[]);
  return fetchAll<Word>((from, to) =>
    supabase.from("words").select("*").in("deck_id", deckIds).order("deck_id").order("created_at").range(from, to),
  );
}

/** Everything that belongs to the user (RLS-scoped reads with their own session). */
export async function buildAccountExport(supabase: Client, userId: string) {
  const [{ data: profile }, { data: settings }, { data: decks }, { data: subscriptions }, { data: groups }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("decks").select("*").eq("owner_id", userId).order("created_at"),
    supabase.from("deck_subscriptions").select("deck_id, subscribed_at, deck:decks(name)").eq("user_id", userId),
    supabase.from("group_members").select("role, joined_at, group:groups(id, name)").eq("user_id", userId),
  ]);
  const ownDecks = decks ?? [];
  const [words, cards, reviews, daily, chatThreads, chatMessages, loginEvents] = await Promise.all([
    deckWords(supabase, ownDecks.map((d) => d.id)),
    fetchAll<Tables<"user_cards">>((f, t) => supabase.from("user_cards").select("*").eq("user_id", userId).order("word_id").range(f, t)),
    fetchAll<Tables<"review_logs">>((f, t) => supabase.from("review_logs").select("*").eq("user_id", userId).order("id").range(f, t)),
    fetchAll<Tables<"daily_stats">>((f, t) => supabase.from("daily_stats").select("*").eq("user_id", userId).order("day").range(f, t)),
    fetchAll<Tables<"chat_threads">>((f, t) => supabase.from("chat_threads").select("*").eq("user_id", userId).order("created_at").range(f, t)),
    fetchAll<Tables<"chat_messages">>((f, t) =>
      supabase.from("chat_messages").select("*").eq("user_id", userId).order("thread_id").order("created_at").range(f, t),
    ),
    fetchAll<Tables<"login_events">>((f, t) =>
      supabase.from("login_events").select("*").eq("user_id", userId).order("id").range(f, t),
    ),
  ]);
  const messagesByThread = new Map<string, Tables<"chat_messages">[]>();
  for (const m of chatMessages) messagesByThread.set(m.thread_id, [...(messagesByThread.get(m.thread_id) ?? []), m]);

  const byDeck = new Map<string, Word[]>();
  for (const w of words) byDeck.set(w.deck_id, [...(byDeck.get(w.deck_id) ?? []), w]);

  return {
    app: "Sổ Từ",
    format_version: 1,
    exported_at: new Date().toISOString(),
    profile,
    settings,
    decks: ownDecks.map((d) => ({ ...d, words: byDeck.get(d.id) ?? [] })),
    subscriptions: (subscriptions ?? []).map((s) => ({ deck_id: s.deck_id, deck_name: s.deck?.name ?? null, subscribed_at: s.subscribed_at })),
    groups: (groups ?? []).map((g) => ({ id: g.group?.id, name: g.group?.name, role: g.role, joined_at: g.joined_at })),
    progress: cards,
    review_logs: reviews,
    daily_stats: daily,
    login_history: loginEvents,
    chats: chatThreads.map((t) => ({
      ...t,
      messages: (messagesByThread.get(t.id) ?? []).map((m) => ({ id: m.id, role: m.role, parts: m.parts, created_at: m.created_at })),
    })),
  };
}

export type AccountExport = Awaited<ReturnType<typeof buildAccountExport>>;

/** All words of the user's own decks, one CSV with a leading deck column. */
export function accountWordsCsv(data: AccountExport) {
  const rows = data.decks.flatMap((d) => d.words.map((w) => [d.name, d.language, ...wordCsvRow(w)]));
  return toCsv(["deck", "language", ...WORD_CSV_HEADER], rows);
}
