import "server-only";
import { estimateLevel } from "@/lib/ai/tutor/level";
import { levelOf } from "@/lib/lang/registry";
import type { LangCode } from "@/lib/lang/types";
import type { ServerSupabase } from "@/lib/supabase/server";

export type SnapshotWord = { term: string; reading: string | null; meaning_vi: string; lapses: number };
export type LangSnapshot = {
  language: LangCode;
  total: number;
  due: number;
  hard: SnapshotWord[];
  recent: SnapshotWord[];
  /** Estimated level from the words they study ("B1", "HSK 2"); absent when there is too little to say. */
  level?: string;
};

type StoredWord = { term: string; reading: string | null; meaning_vi: string; lang_extra?: unknown };
type WordLists = { hard: SnapshotWord[]; recent: SnapshotWord[]; levels: (string | null)[] };

/**
 * What the tutor knows about the learner before the first word of its answer: per language,
 * how many words they study, how many are due, the words they forget most and the newest ones,
 * and an estimated level (from the CEFR / HSK labels of those words, no extra query).
 * Put into the instructions so most answers need no tool call (fewer steps, fewer empty turns).
 * Read through the user's own client (RLS); any failure just leaves that part out.
 */
export async function learnerSnapshot(supabase: ServerSupabase, languages: LangCode[]): Promise<LangSnapshot[]> {
  const words = async (language: LangCode, source: "hard" | "recent", limit: number) => {
    const { data } = await supabase.rpc("practice_words", {
      p_deck_id: null as unknown as string, // null = every deck the user studies
      p_language: language,
      p_source: source,
      p_limit: limit,
    });
    const rows = (data ?? []).map((row) => ({ w: row.word as unknown as StoredWord, lapses: row.lapses }));
    return {
      list: rows.map(({ w, lapses }) => ({ term: w.term, reading: w.reading, meaning_vi: w.meaning_vi, lapses })),
      levels: rows.map(({ w }) => levelOf(language, w.lang_extra)),
    };
  };

  const lists = async (language: LangCode): Promise<WordLists> => {
    const [hard, recent] = await Promise.all([words(language, "hard", 8), words(language, "recent", 6)]);
    return { hard: hard.list, recent: recent.list, levels: [...hard.levels, ...recent.levels] };
  };

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
        const { hard, recent, levels } = total ? (ready.get(language) ?? (await lists(language))) : { hard: [], recent: [], levels: [] };
        const level = estimateLevel(language, levels);
        return {
          language,
          total,
          due: Math.min(Number(row?.due_count ?? 0), row?.reviews_left ?? Infinity),
          hard: hard.filter((w) => w.lapses > 0),
          recent,
          ...(level ? { level } : {}),
        };
      }),
    );
  } catch (e) {
    console.error("[tutor] learner snapshot", e);
    return [];
  }
}
