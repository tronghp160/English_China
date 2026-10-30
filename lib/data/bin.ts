import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LangCode } from "@/lib/lang/types";
import { addDays, computeStreak } from "@/lib/srs/streak";
import { readPrefs } from "@/lib/validation";
import {
  BUDDIES,
  buddyBySpecies,
  eggCondition,
  eggsEarned,
  hatchProgress,
  isBuddySpecies,
  type BuddiesData,
  type BuddySpecies,
  type BuddyView,
} from "@/lib/bin/buddies";

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

  const [settingsRes, statsRes, dueRes, missesRes, tripRes, freezesRes] = await Promise.all([
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
    admin.from("bin_freezes").select("day").eq("user_id", userId).gte("day", addDays(today, -400)),
  ]);

  const prefs = readPrefs(settingsRes.data?.prefs);
  const name = prefs.mascot_name || "Bin";

  const stats = statsRes.data ?? [];
  const frozenDays = (freezesRes.data ?? []).map((r) => r.day);
  const streakObj = computeStreak(
    stats.filter((d) => d.reviews > 0).map((d) => d.day),
    today,
    frozenDays,
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

export async function syncBuddiesData(userId: string): Promise<BuddiesData> {
  const admin = createAdminClient();

  const [settingsRes, statsRes, masteredRes, buddiesRes] = await Promise.all([
    admin.from("user_settings").select("prefs").eq("user_id", userId).maybeSingle(),
    admin.from("daily_stats").select("correct").eq("user_id", userId),
    admin.rpc("bin_mastered_counts", { p_user: userId }),
    admin.from("bin_buddies").select("species, name, start_correct, hatched_at").eq("user_id", userId),
  ]);

  const totalCorrect = (statsRes.data ?? []).reduce((sum, r) => sum + r.correct, 0);

  const mastered = { en: 0, zh: 0 };
  for (const row of masteredRes.data ?? []) {
    if (row.language === "en" || row.language === "zh") {
      mastered[row.language] = row.n;
    }
  }

  let buddiesRows = buddiesRes.data ?? [];
  const have = new Set<BuddySpecies>(buddiesRows.map((r) => r.species as BuddySpecies));

  const newEggs = eggsEarned(mastered, have);
  if (newEggs.length > 0) {
    const inserts = newEggs.map((sp) => {
      const buddyDef = buddyBySpecies(sp);
      return {
        user_id: userId,
        species: sp,
        name: buddyDef?.defaultName ?? sp,
        start_correct: totalCorrect,
      };
    });

    const { data: insertedRows } = await admin
      .from("bin_buddies")
      .insert(inserts)
      .select("species, name, start_correct, hatched_at");

    if (insertedRows && insertedRows.length > 0) {
      buddiesRows = [...buddiesRows, ...insertedRows];
    }
  }

  const prefs = readPrefs(settingsRes.data?.prefs);
  let active: BuddySpecies | null = null;
  if (isBuddySpecies(prefs.bin_buddy)) {
    const hatchedRow = buddiesRows.find(
      (r) => r.species === prefs.bin_buddy && r.hatched_at !== null,
    );
    if (hatchedRow) {
      active = prefs.bin_buddy;
    }
  }

  const buddies: BuddyView[] = BUDDIES.map((b) => {
    const row = buddiesRows.find((r) => r.species === b.species);
    const cond = eggCondition(b);
    const currentMastered =
      b.egg.lang === "any"
        ? mastered.en + mastered.zh
        : mastered[b.egg.lang] ?? 0;

    if (!row) {
      return {
        species: b.species,
        name: b.defaultName,
        state: "locked" as const,
        condition: cond,
        mastered: currentMastered,
        hatch: null,
      };
    }

    if (row.hatched_at !== null) {
      return {
        species: b.species,
        name: row.name,
        state: "hatched" as const,
        condition: cond,
        mastered: currentMastered,
        hatch: null,
      };
    }

    return {
      species: b.species,
      name: row.name,
      state: "egg" as const,
      condition: cond,
      mastered: currentMastered,
      hatch: hatchProgress({
        totalCorrect,
        startCorrect: row.start_correct,
        need: b.hatchCorrect,
      }),
    };
  });

  return {
    buddies,
    active,
    newEggs,
  };
}
