import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LangCode } from "@/lib/lang/types";
import { addDays, computeStreak } from "@/lib/srs/streak";
import { readPrefs } from "@/lib/validation";

export type TripCandidateWord = {
  id: string;
  term: string;
  meaning_vi: string;
  language: LangCode;
  reading: string | null;
  lapses: number;
  state: string;
  last_review: string | null;
};

export async function tripWordCandidates(userId: string): Promise<TripCandidateWord[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("bin_trip_candidates", { p_user: userId });
  if (error || !data) return [];
  return data as TripCandidateWord[];
}

export type GreetingWord = {
  id: string;
  term: string;
  meaningVi: string | null;
  language: LangCode;
};

export type GreetingContext = {
  name: string;
  streak: number;
  dueToday: number;
  reviewedToday: number;
  hardWords: GreetingWord[];
  newYesterday: GreetingWord[];
  tripBack: boolean;
};

export async function greetingContext(userId: string, today: string): Promise<GreetingContext> {
  const admin = createAdminClient();

  const [settingsRes, statsRes, dueRes, missesRes, tripRes] = await Promise.all([
    admin.from("user_settings").select("prefs, timezone").eq("user_id", userId).maybeSingle(),
    admin
      .from("daily_stats")
      .select("day, reviews")
      .eq("user_id", userId)
      .gte("day", addDays(today, -400))
      .order("day"),
    admin.from("user_cards").select("id", { count: "exact", head: true }).eq("user_id", userId).lte("due_at", new Date().toISOString()),
    admin.rpc("bin_recent_misses", { p_days: 2, p_user: userId }),
    admin.from("bin_trips").select("id").eq("user_id", userId).is("collected_at", null).lte("returns_at", new Date().toISOString()).maybeSingle(),
  ]);

  const prefs = readPrefs(settingsRes.data?.prefs);
  const name = prefs.mascot_name || "Bin";

  const stats = statsRes.data ?? [];
  const streakObj = computeStreak(
    stats.filter((d) => d.reviews > 0).map((d) => d.day),
    today,
  );
  const streak = streakObj.current;
  const reviewedToday = stats.find((d) => d.day === today)?.reviews ?? 0;
  const dueToday = dueRes.count ?? 0;

  const hardWords: GreetingWord[] = (missesRes.data ?? []).slice(0, 3).map((r) => ({
    id: r.word_id,
    term: r.term,
    meaningVi: r.meaning_vi,
    language: r.language as LangCode,
  }));

  const yesterday = addDays(today, -1);
  const yStart = new Date(`${yesterday}T00:00:00Z`).toISOString();
  const yEnd = new Date(`${today}T00:00:00Z`).toISOString();

  const { data: newLogs } = await admin
    .from("review_logs")
    .select("word:words(id, term, meaning_vi, language)")
    .eq("user_id", userId)
    .eq("state_before", "new")
    .gte("reviewed_at", yStart)
    .lt("reviewed_at", yEnd)
    .order("reviewed_at", { ascending: false })
    .limit(10);

  const seenIds = new Set<string>();
  const newYesterday: GreetingWord[] = [];
  for (const log of newLogs ?? []) {
    const w = log.word as unknown as { id: string; term: string; meaning_vi: string | null; language: LangCode } | null;
    if (w && !seenIds.has(w.id)) {
      seenIds.add(w.id);
      newYesterday.push({
        id: w.id,
        term: w.term,
        meaningVi: w.meaning_vi,
        language: w.language,
      });
      if (newYesterday.length >= 3) break;
    }
  }

  const tripBack = !!tripRes.data;

  return {
    name,
    streak,
    dueToday,
    reviewedToday,
    hardWords,
    newYesterday,
    tripBack,
  };
}
