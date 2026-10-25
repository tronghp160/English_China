import "server-only";
import { envAdminEmails } from "@/lib/admin";
import { serverEnv } from "@/lib/env";
import { levelFromXp } from "@/lib/progress";
import { sanitizeSearch } from "@/lib/search";
import { addDays, computeStreak, longestStreak, studyDay } from "@/lib/srs/streak";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type { ImageSource } from "@/lib/word-schema";

/**
 * What /admin shows. Everything is read with the service role (it crosses every account), so only call these
 * after `requireAdmin()`.
 */

/** Today's date in Vietnam (the default study timezone), as daily_stats and ai_usage store it. */
function todayVn() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

export type AdminOverview = {
  users: number;
  newUsers7d: number;
  activeToday: number;
  reviewsToday: number;
  aiToday: number;
  aiLimit: number;
  decks: number;
  publicDecks: number;
  groups: number;
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const sb = createAdminClient();
  const day = todayVn();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [users, newUsers7d, decks, publicDecks, groups, stats, ai] = await Promise.all([
    count(sb.from("profiles").select("id", { count: "exact", head: true })),
    count(sb.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekAgo)),
    count(sb.from("decks").select("id", { count: "exact", head: true })),
    count(sb.from("decks").select("id", { count: "exact", head: true }).eq("visibility", "public")),
    count(sb.from("groups").select("id", { count: "exact", head: true })),
    sb.from("daily_stats").select("reviews").eq("day", day).gt("reviews", 0),
    sb.from("ai_usage").select("requests").eq("day", day),
  ]);
  return {
    users,
    newUsers7d,
    activeToday: stats.data?.length ?? 0,
    reviewsToday: (stats.data ?? []).reduce((n, r) => n + r.reviews, 0),
    aiToday: (ai.data ?? []).reduce((n, r) => n + r.requests, 0),
    aiLimit: serverEnv().AI_GLOBAL_DAILY_LIMIT,
    decks,
    publicDecks,
    groups,
  };
}

export type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  username: string;
  createdAt: string;
  lastSignInAt: string | null;
  banned: boolean;
  admin: boolean;
  /** Admin through ADMIN_EMAILS: can only be changed in the env. */
  envAdmin: boolean;
  decks: number;
};

/** Every auth user (up to 5000, enough for this app), newest first. */
async function allAuthUsers() {
  const sb = createAdminClient();
  const out = [];
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    out.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return out;
}

export const USERS_PER_PAGE = 30;

export async function listAdminUsers({ q, page }: { q: string; page: number }): Promise<{ users: AdminUser[]; total: number }> {
  const sb = createAdminClient();
  const [authUsers, { data: profiles }, { data: decks }, { data: admins }] = await Promise.all([
    allAuthUsers(),
    sb.from("profiles").select("id, username, display_name"),
    sb.from("decks").select("owner_id"),
    sb.from("app_admins").select("user_id"),
  ]);
  const profileOf = new Map((profiles ?? []).map((p) => [p.id, p]));
  const deckCount = new Map<string, number>();
  for (const d of decks ?? []) deckCount.set(d.owner_id, (deckCount.get(d.owner_id) ?? 0) + 1);
  const adminIds = new Set((admins ?? []).map((a) => a.user_id));
  const envEmails = envAdminEmails();

  const needle = q.trim().toLowerCase().replace(/^@/, "");
  const rows = authUsers
    .map((u): AdminUser => {
      const p = profileOf.get(u.id);
      const email = u.email ?? "";
      const envAdmin = envEmails.includes(email.toLowerCase());
      return {
        id: u.id,
        email,
        displayName: p?.display_name ?? "(chưa có hồ sơ)",
        username: p?.username ?? "",
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        banned: Boolean(u.banned_until && new Date(u.banned_until) > new Date()),
        admin: envAdmin || adminIds.has(u.id),
        envAdmin,
        decks: deckCount.get(u.id) ?? 0,
      };
    })
    .filter((u) => !needle || [u.email, u.username, u.displayName].some((v) => v.toLowerCase().includes(needle)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const start = (Math.max(1, page) - 1) * USERS_PER_PAGE;
  return { users: rows.slice(start, start + USERS_PER_PAGE), total: rows.length };
}

export type AdminDeck = {
  id: string;
  name: string;
  language: "en" | "zh";
  wordCount: number;
  learners: number;
  createdAt: string;
  owner: string;
};

export async function listPublicDecks(): Promise<AdminDeck[]> {
  const sb = createAdminClient();
  const { data: decks } = await sb
    .from("decks")
    .select("id, name, language, word_count, learner_count, created_at, owner_id")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(200);
  const ownerIds = [...new Set((decks ?? []).map((d) => d.owner_id))];
  const { data: owners } = ownerIds.length ? await sb.from("profiles").select("id, username").in("id", ownerIds) : { data: [] };
  const nameOf = new Map((owners ?? []).map((o) => [o.id, o.username]));
  return (decks ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    language: d.language,
    wordCount: d.word_count,
    learners: d.learner_count,
    createdAt: d.created_at,
    owner: nameOf.get(d.owner_id) ?? "?",
  }));
}

export type AdminGroup = { id: string; name: string; owner: string; members: number; createdAt: string };

export async function listGroups(): Promise<AdminGroup[]> {
  const sb = createAdminClient();
  const [{ data: groups }, { data: members }] = await Promise.all([
    sb.from("groups").select("id, name, owner_id, created_at").order("created_at", { ascending: false }).limit(200),
    sb.from("group_members").select("group_id"),
  ]);
  const ownerIds = [...new Set((groups ?? []).map((g) => g.owner_id))];
  const { data: owners } = ownerIds.length ? await sb.from("profiles").select("id, username").in("id", ownerIds) : { data: [] };
  const nameOf = new Map((owners ?? []).map((o) => [o.id, o.username]));
  const memberCount = new Map<string, number>();
  for (const m of members ?? []) if (m.group_id) memberCount.set(m.group_id, (memberCount.get(m.group_id) ?? 0) + 1);
  return (groups ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    owner: nameOf.get(g.owner_id) ?? "?",
    members: memberCount.get(g.id) ?? 0,
    createdAt: g.created_at,
  }));
}

export type AdminEntry = { userId: string | null; email: string; envAdmin: boolean; grantedAt: string | null };

/** Admins from ADMIN_EMAILS first, then the ones granted in the app. */
export async function listAdmins(): Promise<AdminEntry[]> {
  const sb = createAdminClient();
  const { data: rows } = await sb.from("app_admins").select("user_id, granted_at").order("granted_at");
  const granted = await Promise.all(
    (rows ?? []).map(async (r) => {
      const { data } = await sb.auth.admin.getUserById(r.user_id);
      return { userId: r.user_id, email: data.user?.email ?? "(không rõ)", envAdmin: false, grantedAt: r.granted_at };
    }),
  );
  const env = envAdminEmails().map((email) => ({ userId: null, email, envAdmin: true, grantedAt: null }));
  return [...env, ...granted.filter((g) => !env.some((e) => e.email === g.email.toLowerCase()))];
}

/** Finds an auth user by email (case-insensitive). */
export async function findUserByEmail(email: string) {
  const needle = email.trim().toLowerCase();
  return (await allAuthUsers()).find((u) => u.email?.toLowerCase() === needle) ?? null;
}

/** Resolves an email or @username string to user ID */
export async function resolveUserParam(input: string): Promise<string | null> {
  const clean = input.trim();
  if (!clean) return null;
  if (clean.includes("@") && !clean.startsWith("@")) {
    const u = await findUserByEmail(clean);
    return u?.id ?? null;
  }
  const uname = clean.replace(/^@/, "");
  const sb = createAdminClient();
  const { data: prof } = await sb
    .from("profiles")
    .select("id")
    .ilike("username", uname)
    .maybeSingle();
  if (prof) return prof.id;
  const u = await findUserByEmail(clean);
  return u?.id ?? null;
}

export type AdminUserDetail = {
  id: string;
  email: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  banned: boolean;
  admin: boolean;
  envAdmin: boolean;
  settings: { studyLangs: string[]; dailyGoal: number; dailyNewLimit: number; timezone: string; onboarded: boolean } | null;
  study: {
    totalXp: number;
    level: number;
    reviews: number;
    correct: number;
    activeDays: number;
    streak: number;
    longestStreak: number;
    lastActiveDay: string | null;
    wordsAdded: number;
    /** Reviews per day for the last 30 study days, oldest first. */
    last30: { day: string; reviews: number }[];
  };
  cards: { new: number; learning: number; review: number; relearning: number; suspended: number };
  decks: { id: string; name: string; language: "en" | "zh"; visibility: string; words: number; learners: number }[];
  subscriptions: number;
  groups: { id: string; name: string; role: string }[];
  recentReviews: { at: string; term: string; mode: string; rating: number; correct: boolean | null }[];
  ai: { today: number; last7: number };
  /** Only how many: what someone asked the tutor stays private. */
  chat: { threads: number; messages: number };
};

/** Everything /admin/users/[id] shows about one account, or null when it does not exist. */
export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const sb = createAdminClient();
  const { data: auth } = await sb.auth.admin.getUserById(userId);
  const u = auth.user;
  if (!u) return null;
  const [profile, settings, stats, cards, decks, subs, memberships, reviews, ai, threads, messages, adminRow] = await Promise.all([
    sb.from("profiles").select("display_name, username, avatar_url").eq("id", userId).maybeSingle(),
    sb.from("user_settings").select("study_langs, daily_goal, daily_new_limit, timezone, onboarded").eq("user_id", userId).maybeSingle(),
    sb.from("daily_stats").select("day, reviews, correct, xp, words_added").eq("user_id", userId),
    sb.from("user_cards").select("state, suspended").eq("user_id", userId),
    sb.from("decks").select("id, name, language, visibility, word_count, learner_count").eq("owner_id", userId).order("created_at"),
    sb.from("deck_subscriptions").select("deck_id", { count: "exact", head: true }).eq("user_id", userId),
    sb.from("group_members").select("role, group_id").eq("user_id", userId),
    sb.from("review_logs").select("reviewed_at, word_id, mode, rating, was_correct").eq("user_id", userId).order("reviewed_at", { ascending: false }).limit(15),
    sb.from("ai_usage").select("day, requests").eq("user_id", userId).gte("day", new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)),
    sb.from("chat_threads").select("id", { count: "exact", head: true }).eq("user_id", userId),
    sb.from("chat_messages").select("id", { count: "exact", head: true }).eq("user_id", userId),
    sb.from("app_admins").select("user_id").eq("user_id", userId).maybeSingle(),
  ]);

  const groupIds = (memberships.data ?? []).map((m) => m.group_id).filter((g): g is string => Boolean(g));
  const wordIds = [...new Set((reviews.data ?? []).map((r) => r.word_id))];
  const [groups, words] = await Promise.all([
    groupIds.length ? sb.from("groups").select("id, name").in("id", groupIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    wordIds.length ? sb.from("words").select("id, term").in("id", wordIds) : Promise.resolve({ data: [] as { id: string; term: string }[] }),
  ]);
  const groupName = new Map((groups.data ?? []).map((g) => [g.id, g.name]));
  const termOf = new Map((words.data ?? []).map((w) => [w.id, w.term]));

  const rows = stats.data ?? [];
  const timezone = settings.data?.timezone ?? "Asia/Ho_Chi_Minh";
  const today = studyDay(new Date(), timezone);
  const active = rows.filter((r) => r.reviews > 0).map((r) => r.day);
  const perDay = new Map(rows.map((r) => [r.day, r.reviews]));
  const totalXp = rows.reduce((n, r) => n + r.xp, 0);
  const cardRows = cards.data ?? [];
  const byState = (s: string) => cardRows.filter((c) => !c.suspended && c.state === s).length;
  const email = u.email ?? "";
  const envAdmin = envAdminEmails().includes(email.toLowerCase());
  const aiRows = ai.data ?? [];

  return {
    id: u.id,
    email,
    displayName: profile.data?.display_name ?? "(chưa có hồ sơ)",
    username: profile.data?.username ?? "",
    avatarUrl: profile.data?.avatar_url ?? null,
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at ?? null,
    banned: Boolean(u.banned_until && new Date(u.banned_until) > new Date()),
    admin: envAdmin || Boolean(adminRow.data),
    envAdmin,
    settings: settings.data
      ? {
          studyLangs: settings.data.study_langs,
          dailyGoal: settings.data.daily_goal,
          dailyNewLimit: settings.data.daily_new_limit,
          timezone,
          onboarded: settings.data.onboarded,
        }
      : null,
    study: {
      totalXp,
      level: levelFromXp(totalXp).level,
      reviews: rows.reduce((n, r) => n + r.reviews, 0),
      correct: rows.reduce((n, r) => n + r.correct, 0),
      activeDays: active.length,
      streak: computeStreak(active, today).current,
      // the current streak may bridge rest days that longestStreak does not count (same rule as getProgress)
      longestStreak: Math.max(longestStreak(active), computeStreak(active, today).current),
      lastActiveDay: active.sort().at(-1) ?? null,
      wordsAdded: rows.reduce((n, r) => n + r.words_added, 0),
      last30: Array.from({ length: 30 }, (_, i) => {
        const day = addDays(today, i - 29);
        return { day, reviews: perDay.get(day) ?? 0 };
      }),
    },
    cards: {
      new: byState("new"),
      learning: byState("learning"),
      review: byState("review"),
      relearning: byState("relearning"),
      suspended: cardRows.filter((c) => c.suspended).length,
    },
    decks: (decks.data ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      language: d.language,
      visibility: d.visibility,
      words: d.word_count,
      learners: d.learner_count,
    })),
    subscriptions: subs.count ?? 0,
    groups: (memberships.data ?? []).map((m) => ({ id: m.group_id ?? "", name: groupName.get(m.group_id ?? "") ?? "?", role: m.role })),
    recentReviews: (reviews.data ?? []).map((r) => ({
      at: r.reviewed_at,
      term: termOf.get(r.word_id) ?? "(từ đã xóa)",
      mode: r.mode,
      rating: r.rating,
      correct: r.was_correct,
    })),
    ai: { today: aiRows.find((r) => r.day === todayVn())?.requests ?? 0, last7: aiRows.reduce((n, r) => n + r.requests, 0) },
    chat: { threads: threads.count ?? 0, messages: messages.count ?? 0 },
  };
}

export const WORDS_PER_PAGE = 50;

export type WordFilter = {
  q?: string;
  lang?: "en" | "zh";
  deckId?: string;
  status?: string;
  page: number;
};

export type AdminWordRow = {
  id: string;
  term: string;
  reading: string | null;
  meaning_vi: string;
  meaning_en: string | null;
  language: "en" | "zh";
  parts_of_speech: string[];
  topic: string | null;
  examples: { text: string; vi?: string; reading?: string }[];
  collocations: { text: string; vi?: string }[];
  synonyms: string[];
  antonyms: string[];
  lang_extra: Record<string, unknown> | null;
  image_url: string | null;
  image_source: ImageSource | null;
  personal_note: string | null;
  ai_generated: boolean;
  created_at: string;
  deck_id: string;
  created_by: string | null;
  deck: { id: string; name: string; visibility: string; owner_id: string } | null;
  creatorName?: string | null;
  status?: string | null;
  lapseCount?: number | null;
  card?: {
    state: "new" | "learning" | "review" | "relearning";
    lapses: number;
    suspended: boolean;
  } | null;
};

export type AdminDeckDetail = {
  id: string;
  name: string;
  description: string | null;
  language: "en" | "zh";
  visibility: "private" | "unlisted" | "public";
  owner_id: string;
  created_at: string;
  updated_at: string;
  word_count: number;
  learner_count: number;
  owner: { id: string; displayName: string; username: string };
  group?: { id: string; name: string } | null;
  learners: { userId: string; displayName: string; username: string; subscribedAt: string }[];
};

export type AdminReview = {
  id: number;
  reviewedAt: string;
  wordId: string;
  term: string;
  mode: string;
  rating: number;
  correct: boolean | null;
  durationMs: number | null;
};

export type AdminThread = {
  id: string;
  title: string;
  language: "en" | "zh";
  deckId: string | null;
  deckName?: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};

export type AdminMessage = {
  id: string;
  threadId: string;
  userId: string;
  role: string;
  parts: unknown;
  createdAt: string;
};

export type AdminAccount = {
  user: {
    id: string;
    email: string;
    emailConfirmedAt: string | null;
    createdAt: string;
    lastSignInAt: string | null;
    bannedUntil: string | null;
    provider: string;
    metadata: Record<string, unknown>;
  };
  settings: {
    studyLangs: string[];
    dailyGoal: number;
    dailyNewLimit: number;
    timezone: string;
    onboarded: boolean;
    prefs: Record<string, unknown>;
  } | null;
  pushDevicesCount: number;
  aiUsage30d: number;
  groups: { id: string; name: string; role: string }[];
};

/** All words across the app (for admin words tab) */
export async function listAdminWords(
  f: WordFilter & { creatorId?: string },
): Promise<{ rows: AdminWordRow[]; total: number }> {
  const sb = createAdminClient();
  let query = sb
    .from("words")
    .select(
      "id, term, reading, meaning_vi, meaning_en, language, parts_of_speech, topic, examples, collocations, synonyms, antonyms, lang_extra, image_url, image_source, personal_note, ai_generated, created_at, deck_id, created_by, deck:decks(id, name, visibility, owner_id)",
      { count: "exact" },
    );

  if (f.creatorId) query = query.eq("created_by", f.creatorId);
  if (f.deckId) query = query.eq("deck_id", f.deckId);
  if (f.lang) query = query.eq("language", f.lang);
  if (f.q) {
    const cleanQ = sanitizeSearch(f.q);
    if (cleanQ) query = query.or(`term.ilike.%${cleanQ}%,meaning_vi.ilike.%${cleanQ}%`);
  }

  const from = (Math.max(1, f.page) - 1) * WORDS_PER_PAGE;
  const to = from + WORDS_PER_PAGE - 1;
  const { data, count } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  const rows = (data ?? []) as unknown as AdminWordRow[];
  const creatorIds = [...new Set(rows.map((w) => w.created_by).filter((id): id is string => Boolean(id)))];
  if (creatorIds.length > 0) {
    const { data: profiles } = await sb
      .from("profiles")
      .select("id, display_name, username")
      .in("id", creatorIds);
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name || `@${p.username}`]));
    rows.forEach((r) => {
      if (r.created_by) r.creatorName = profileMap.get(r.created_by) ?? null;
    });
  }

  return { rows, total: count ?? 0 };
}

/** Words belonging to a specific user (their decks + words they added), with learning status */
export async function listUserWords(
  userId: string,
  f: WordFilter,
): Promise<{ rows: AdminWordRow[]; total: number }> {
  const sb = createAdminClient();
  const { data: ownedDecks } = await sb.from("decks").select("id").eq("owner_id", userId);
  const deckIds = (ownedDecks ?? []).map((d) => d.id);

  let query = sb
    .from("words")
    .select(
      "id, term, reading, meaning_vi, meaning_en, language, parts_of_speech, topic, examples, collocations, synonyms, antonyms, lang_extra, image_url, image_source, personal_note, ai_generated, created_at, deck_id, created_by, deck:decks(id, name, visibility, owner_id)",
      { count: "exact" },
    );

  if (deckIds.length > 0) {
    query = query.or(`deck_id.in.(${deckIds.join(",")}),created_by.eq.${userId}`);
  } else {
    query = query.eq("created_by", userId);
  }

  if (f.deckId) query = query.eq("deck_id", f.deckId);
  if (f.lang) query = query.eq("language", f.lang);
  if (f.q) {
    const cleanQ = sanitizeSearch(f.q);
    if (cleanQ) query = query.or(`term.ilike.%${cleanQ}%,meaning_vi.ilike.%${cleanQ}%`);
  }

  if (f.status) {
    if (f.status === "suspended") {
      const { data: uc } = await sb
        .from("user_cards")
        .select("word_id")
        .eq("user_id", userId)
        .eq("suspended", true);
      const wids = (uc ?? []).map((c) => c.word_id);
      query = query.in("id", wids.length ? wids : ["00000000-0000-0000-0000-000000000000"]);
    } else if (f.status === "hard") {
      const { data: uc } = await sb
        .from("user_cards")
        .select("word_id")
        .eq("user_id", userId)
        .gte("lapses", 3);
      const wids = (uc ?? []).map((c) => c.word_id);
      query = query.in("id", wids.length ? wids : ["00000000-0000-0000-0000-000000000000"]);
    } else if (f.status === "learned") {
      const { data: uc } = await sb
        .from("user_cards")
        .select("word_id")
        .eq("user_id", userId)
        .eq("suspended", false)
        .eq("state", "review")
        .lt("lapses", 3);
      const wids = (uc ?? []).map((c) => c.word_id);
      query = query.in("id", wids.length ? wids : ["00000000-0000-0000-0000-000000000000"]);
    } else if (f.status === "learning") {
      const { data: uc } = await sb
        .from("user_cards")
        .select("word_id")
        .eq("user_id", userId)
        .eq("suspended", false)
        .in("state", ["learning", "relearning"]);
      const wids = (uc ?? []).map((c) => c.word_id);
      query = query.in("id", wids.length ? wids : ["00000000-0000-0000-0000-000000000000"]);
    } else if (f.status === "new") {
      const { data: ucNotNew } = await sb
        .from("user_cards")
        .select("word_id")
        .eq("user_id", userId)
        .neq("state", "new");
      const notNewWids = (ucNotNew ?? []).map((c) => c.word_id);
      if (notNewWids.length > 0) {
        query = query.not("id", "in", `(${notNewWids.join(",")})`);
      }
    }
  }

  const from = (Math.max(1, f.page) - 1) * WORDS_PER_PAGE;
  const to = from + WORDS_PER_PAGE - 1;
  const { data, count } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  const rows = (data ?? []) as unknown as AdminWordRow[];
  const pageWordIds = rows.map((r) => r.id);

  if (pageWordIds.length > 0) {
    const [{ data: userCards }, { data: profiles }] = await Promise.all([
      sb
        .from("user_cards")
        .select("word_id, state, suspended, lapses")
        .eq("user_id", userId)
        .eq("direction", "recognize")
        .in("word_id", pageWordIds),
      sb
        .from("profiles")
        .select("id, display_name, username")
        .in("id", [...new Set(rows.map((r) => r.created_by).filter((id): id is string => Boolean(id)))]),
    ]);

    const cardMap = new Map((userCards ?? []).map((c) => [c.word_id, c]));
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name || `@${p.username}`]));

    rows.forEach((r) => {
      const uc = cardMap.get(r.id);
      r.status = uc ? (uc.suspended ? "suspended" : uc.state) : "new";
      r.lapseCount = uc?.lapses ?? 0;
      r.card = uc
        ? {
            state: uc.state,
            lapses: uc.lapses,
            suspended: uc.suspended,
          }
        : { state: "new", lapses: 0, suspended: false };
      if (r.created_by) r.creatorName = profileMap.get(r.created_by) ?? null;
    });
  }

  return { rows, total: count ?? 0 };
}

/** Admin view of a single deck */
export async function getAdminDeck(deckId: string): Promise<AdminDeckDetail | null> {
  const sb = createAdminClient();
  const { data: deck } = await sb
    .from("decks")
    .select("id, name, description, language, visibility, owner_id, created_at, updated_at, word_count, learner_count, group_id")
    .eq("id", deckId)
    .maybeSingle();

  if (!deck) return null;

  const [{ data: ownerProfile }, { data: group }, { data: subscriptions }] = await Promise.all([
    sb.from("profiles").select("id, display_name, username").eq("id", deck.owner_id).maybeSingle(),
    deck.group_id
      ? sb.from("groups").select("id, name").eq("id", deck.group_id).maybeSingle()
      : Promise.resolve({ data: null }),
    sb
      .from("deck_subscriptions")
      .select("user_id, subscribed_at, profile:profiles(id, display_name, username)")
      .eq("deck_id", deckId)
      .order("subscribed_at", { ascending: false }),
  ]);

  return {
    id: deck.id,
    name: deck.name,
    description: deck.description,
    language: deck.language as "en" | "zh",
    visibility: deck.visibility as "private" | "unlisted" | "public",
    owner_id: deck.owner_id,
    created_at: deck.created_at,
    updated_at: deck.updated_at,
    word_count: deck.word_count,
    learner_count: deck.learner_count,
    owner: {
      id: deck.owner_id,
      displayName: ownerProfile?.display_name || "Chưa đặt tên",
      username: ownerProfile?.username || "user",
    },
    group: group ? { id: group.id, name: group.name } : null,
    learners: (subscriptions ?? []).map((s) => {
      const prof = s.profile as { id?: string; display_name?: string; username?: string } | null;
      return {
        userId: s.user_id,
        displayName: prof?.display_name || "Chưa đặt tên",
        username: prof?.username || "user",
        subscribedAt: s.subscribed_at,
      };
    }),
  };
}

/** Words inside a deck for admin view */
export async function listDeckWords(
  deckId: string,
  f: { q?: string; page: number },
): Promise<{ rows: AdminWordRow[]; total: number }> {
  return listAdminWords({ ...f, deckId });
}

/** 30-day daily stats of a user */
export async function getUserDailyStats30(userId: string) {
  const sb = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const { data } = await sb
    .from("daily_stats")
    .select("day, reviews, correct, new_learned, words_added, xp")
    .eq("user_id", userId)
    .gte("day", thirtyDaysAgo)
    .order("day", { ascending: false });
  return data ?? [];
}

/** Latest 200 review logs for a user */
export async function listUserReviews(userId: string, mode?: string): Promise<AdminReview[]> {
  const sb = createAdminClient();
  let query = sb
    .from("review_logs")
    .select("id, reviewed_at, word_id, mode, rating, was_correct, duration_ms, word:words(term)")
    .eq("user_id", userId)
    .order("reviewed_at", { ascending: false })
    .limit(200);

  if (mode) query = query.eq("mode", mode as Database["public"]["Enums"]["review_mode"]);
  const { data } = await query;

  return (data ?? []).map((r) => ({
    id: r.id,
    reviewedAt: r.reviewed_at,
    wordId: r.word_id,
    term: (r.word as { term?: string } | null)?.term ?? "(từ đã xóa)",
    mode: r.mode,
    rating: r.rating,
    correct: r.was_correct,
    durationMs: r.duration_ms,
  }));
}

/** Chat threads of a user */
export async function listUserChats(userId: string): Promise<AdminThread[]> {
  const sb = createAdminClient();
  const { data: threads } = await sb
    .from("chat_threads")
    .select("id, title, language, deck_id, created_at, updated_at, deck:decks(name)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  const threadIds = (threads ?? []).map((t) => t.id);
  const { data: messages } = threadIds.length
    ? await sb.from("chat_messages").select("thread_id")
    : { data: [] };

  const counts = new Map<string, number>();
  (messages ?? []).forEach((m) => {
    counts.set(m.thread_id, (counts.get(m.thread_id) ?? 0) + 1);
  });

  return (threads ?? []).map((t) => ({
    id: t.id,
    title: t.title ?? "Cuộc trò chuyện",
    language: t.language as "en" | "zh",
    deckId: t.deck_id,
    deckName: (t.deck as { name?: string } | null)?.name ?? null,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    messageCount: counts.get(t.id) ?? 0,
  }));
}

/** Full message history of a chat thread */
export async function getUserChat(threadId: string): Promise<AdminMessage[]> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("chat_messages")
    .select("id, thread_id, user_id, role, parts, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((m) => ({
    id: m.id,
    threadId: m.thread_id,
    userId: m.user_id,
    role: m.role,
    parts: m.parts,
    createdAt: m.created_at,
  }));
}

/** Comprehensive account and settings detail of a user */
export async function getUserAccount(userId: string): Promise<AdminAccount | null> {
  const sb = createAdminClient();
  const { data: auth } = await sb.auth.admin.getUserById(userId);
  if (!auth.user) return null;
  const u = auth.user;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const [settings, pushSubs, aiUsage, memberships] = await Promise.all([
    sb.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
    sb.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", userId),
    sb.from("ai_usage").select("requests").eq("user_id", userId).gte("day", thirtyDaysAgo),
    sb.from("group_members").select("role, group:groups(id, name)").eq("user_id", userId),
  ]);

  const aiTotal = (aiUsage.data ?? []).reduce((sum, r) => sum + r.requests, 0);

  return {
    user: {
      id: u.id,
      email: u.email ?? "",
      emailConfirmedAt: u.email_confirmed_at ?? null,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      bannedUntil: u.banned_until ?? null,
      provider: u.app_metadata.provider ?? "email",
      metadata: (u.user_metadata as Record<string, unknown>) ?? {},
    },
    settings: settings.data
      ? {
          studyLangs: settings.data.study_langs,
          dailyGoal: settings.data.daily_goal,
          dailyNewLimit: settings.data.daily_new_limit,
          timezone: settings.data.timezone,
          onboarded: settings.data.onboarded,
          prefs: (settings.data.prefs as Record<string, unknown>) ?? {},
        }
      : null,
    pushDevicesCount: pushSubs.count ?? 0,
    aiUsage30d: aiTotal,
    groups: (memberships.data ?? []).map((m) => {
      const grp = m.group as { id?: string; name?: string } | null;
      return {
        id: grp?.id ?? "",
        name: grp?.name ?? "Nhóm",
        role: m.role,
      };
    }),
  };
}
