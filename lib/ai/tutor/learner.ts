import "server-only";
import type { LangCode } from "@/lib/lang/types";
import type { ServerSupabase } from "@/lib/supabase/server";

export type SnapshotWord = { term: string; reading: string | null; meaning_vi: string; lapses: number };
export type LangSnapshot = { language: LangCode; total: number; due: number; hard: SnapshotWord[]; recent: SnapshotWord[] };

type StoredWord = { term: string; reading: string | null; meaning_vi: string };

/**
 * What the tutor knows about the learner before the first word of its answer: per language,
 * how many words they study, how many are due, the words they forget most and the newest ones.
 * Put into the instructions so most answers need no tool call (fewer steps, fewer empty turns).
 * Read through the user's own client (RLS); any failure just leaves that part out.
 */
export async function learnerSnapshot(supabase: ServerSupabase, languages: LangCode[]): Promise<LangSnapshot[]> {
  const words = async (language: LangCode, source: "hard" | "recent", limit: number): Promise<SnapshotWord[]> => {
    const { data } = await supabase.rpc("practice_words", {
      p_deck_id: null as unknown as string, // null = every deck the user studies
      p_language: language,
      p_source: source,
      p_limit: limit,
    });
    return (data ?? []).map((row) => {
      const w = row.word as unknown as StoredWord;
      return { term: w.term, reading: w.reading, meaning_vi: w.meaning_vi, lapses: row.lapses };
    });
  };

  const lists = (language: LangCode) => Promise.all([words(language, "hard", 8), words(language, "recent", 6)]);

  try {
    // The word lists for the study languages load together with the overview (one round, not two).
    const studied = [...new Set(languages)];
    const [{ data: overview }, early] = await Promise.all([
      supabase.rpc("today_overview"),
      Promise.all(studied.map(async (l) => [l, await lists(l)] as const)),
    ]);
    const rows = overview ?? [];
    const ready = new Map(early);
    const langs = [...new Set([...studied, ...rows.map((r) => r.language)])];
    return await Promise.all(
      langs.map(async (language) => {
        const row = rows.find((r) => r.language === language);
        const total = Number(row?.total_cards ?? 0);
        // A language with cards that is not in study_langs (rare) costs a second round.
        const [hard, recent] = total ? (ready.get(language) ?? (await lists(language))) : [[], []];
        return {
          language,
          total,
          due: Math.min(Number(row?.due_count ?? 0), row?.reviews_left ?? Infinity),
          hard: hard.filter((w) => w.lapses > 0),
          recent,
        };
      }),
    );
  } catch (e) {
    console.error("[tutor] learner snapshot", e);
    return [];
  }
}
