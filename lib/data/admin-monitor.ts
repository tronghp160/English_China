import "server-only";

import { allAuthUsers, USERS_PER_PAGE } from "@/lib/data/admin";
import { computeAttention, type AttentionGroups } from "@/lib/admin-attention";
import {
  aggregatePlaces,
  bucketLevels,
  computeDauWauMau,
  filterAndSortUsers,
  flagLoginEvents,
  type FlaggedLoginEvent,
  type LevelBuckets,
  type PlaceSummary,
} from "@/lib/admin-monitor-utils";
import { buildPetSummary, type PetSummary } from "@/lib/admin-pet";
import {
  placeLabel,
  presenceStatus,
  type DeviceType,
  type PresenceStatus,
} from "@/lib/presence";
import { levelFromXp, type OutfitId } from "@/lib/progress";
import { addDays, studyDay } from "@/lib/srs/streak";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import type { Tables } from "@/lib/supabase/database.types";

export type PresenceRow = Tables<"user_presence">;
export type LoginEventRow = Tables<"login_events">;

export type UserRollup = {
  user_id: string;
  total_xp: number;
  total_reviews: number;
  total_correct: number;
  active_days: number;
  last_active_day: string | null;
};

export type OnlineRow = {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  path: string | null;
  lastSeenAt: string;
  status: PresenceStatus;
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  deviceType: DeviceType;
  browser: string | null;
  os: string | null;
};

export type AdminUserMonitoring = {
  id: string;
  email: string | null;
  displayName: string;
  username: string;
  createdAt: string;
  lastSignInAt: string | null;
  banned: boolean;
  admin: boolean;
  isBanned: boolean;
  isAdmin: boolean;
  envAdmin: boolean;
  decks: number;
  lastSeenAt: string | null;
  status: PresenceStatus;
  place: string;
  deviceType: DeviceType;
  pet: {
    level: number;
    outfit: OutfitId;
    outfitName: string;
    streak: number;
  } | null;
};

export async function getPresenceMap(userIds?: string[]): Promise<Map<string, PresenceRow>> {
  const sb = createAdminClient();
  let query = sb.from("user_presence").select("*");
  if (userIds && userIds.length > 0) {
    query = query.in("user_id", userIds);
  }
  const { data, error } = await query;
  if (error) {
    console.error("[getPresenceMap]", error.message);
    return new Map();
  }
  return new Map((data ?? []).map((row) => [row.user_id, row]));
}

export async function getRollupMap(): Promise<Map<string, UserRollup>> {
  const sb = createAdminClient();
  const { data, error } = await sb.rpc("admin_user_rollup");
  if (error) {
    console.error("[getRollupMap]", error.message);
    return new Map();
  }
  return new Map(
    (data ?? []).map((r) => [
      r.user_id,
      {
        user_id: r.user_id,
        total_xp: Number(r.total_xp),
        total_reviews: Number(r.total_reviews),
        total_correct: Number(r.total_correct),
        active_days: Number(r.active_days),
        last_active_day: r.last_active_day,
      },
    ]),
  );
}

export async function getOnlineNow(): Promise<{ online: OnlineRow[]; away: OnlineRow[] }> {
  const sb = createAdminClient();
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60_000).toISOString();

  const { data: presences, error } = await sb
    .from("user_presence")
    .select("*")
    .gte("last_seen_at", fifteenMinutesAgo)
    .order("last_seen_at", { ascending: false });

  if (error || !presences || presences.length === 0) {
    if (error) console.error("[getOnlineNow]", error.message);
    return { online: [], away: [] };
  }

  const userIds = presences.map((p) => p.user_id);
  const { data: profiles } = await sb
    .from("profiles")
    .select("id, display_name, username, avatar_url")
    .in("id", userIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const online: OnlineRow[] = [];
  const away: OnlineRow[] = [];

  for (const p of presences) {
    const prof = profileMap.get(p.user_id);
    const status = presenceStatus(p.last_seen_at);
    const item: OnlineRow = {
      userId: p.user_id,
      displayName: prof?.display_name || prof?.username || "Người dùng",
      username: prof?.username || "",
      avatarUrl: prof?.avatar_url || null,
      path: p.path,
      lastSeenAt: p.last_seen_at,
      status,
      ip: p.ip,
      country: p.country,
      region: p.region,
      city: p.city,
      latitude: p.latitude,
      longitude: p.longitude,
      deviceType: (p.device_type as DeviceType) || "unknown",
      browser: p.browser,
      os: p.os,
    };

    if (status === "online") {
      online.push(item);
    } else if (status === "away") {
      away.push(item);
    }
  }

  return { online, away };
}

export async function getUserLoginHistory(
  userId: string,
  limit = 50,
): Promise<{
  events: FlaggedLoginEvent<LoginEventRow>[];
  places: PlaceSummary[];
}> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("login_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    if (error) console.error("[getUserLoginHistory]", error.message);
    return { events: [], places: [] };
  }

  const events = flagLoginEvents(data);
  const places = aggregatePlaces(data);

  return { events, places };
}

export async function getPetSummariesFor(userIds: string[]): Promise<Map<string, PetSummary>> {
  if (userIds.length === 0) return new Map();

  const sb = createAdminClient();
  const out = new Map<string, PetSummary>();

  // Chunk by 500
  for (let i = 0; i < userIds.length; i += 500) {
    const chunk = userIds.slice(i, i + 500);
    const [{ data: statsData }, { data: settingsData }] = await Promise.all([
      sb.from("daily_stats").select("user_id, day, reviews, correct, new_learned, xp").in("user_id", chunk),
      sb.from("user_settings").select("user_id, prefs, timezone").in("user_id", chunk),
    ]);

    const statsByUser = new Map<
      string,
      { day: string; reviews: number; correct: number; new_learned: number; xp: number }[]
    >();
    for (const row of statsData ?? []) {
      const list = statsByUser.get(row.user_id) ?? [];
      list.push(row);
      statsByUser.set(row.user_id, list);
    }

    const settingsByUser = new Map<string, { prefs: unknown; timezone: string }>();
    for (const row of settingsData ?? []) {
      settingsByUser.set(row.user_id, {
        prefs: row.prefs,
        timezone: row.timezone || "Asia/Ho_Chi_Minh",
      });
    }

    for (const uid of chunk) {
      const rows = statsByUser.get(uid) ?? [];
      const s = settingsByUser.get(uid);
      out.set(
        uid,
        buildPetSummary({
          rows,
          prefsRaw: s?.prefs ?? {},
          timezone: s?.timezone || "Asia/Ho_Chi_Minh",
        }),
      );
    }
  }

  return out;
}

export async function getPetSummaryFor(userId: string): Promise<PetSummary> {
  const map = await getPetSummariesFor([userId]);
  return (
    map.get(userId) ??
    buildPetSummary({
      rows: [],
      prefsRaw: {},
      timezone: "Asia/Ho_Chi_Minh",
    })
  );
}

export async function listUsersForAdmin({
  q = "",
  page = 1,
  status = "all",
  sort = "created",
}: {
  q?: string;
  page?: number;
  status?: string;
  sort?: string;
}): Promise<{
  users: AdminUserMonitoring[];
  total: number;
  totalPages: number;
}> {
  const sb = createAdminClient();
  const [authUsers, { data: profiles }, { data: decks }, { data: admins }, presenceMap, rollupMap] =
    await Promise.all([
      allAuthUsers(),
      sb.from("profiles").select("id, username, display_name"),
      sb.from("decks").select("owner_id"),
      sb.from("app_admins").select("user_id"),
      getPresenceMap(),
      getRollupMap(),
    ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const adminSet = new Set((admins ?? []).map((a) => a.user_id));
  const deckCounts = new Map<string, number>();
  for (const d of decks ?? []) {
    deckCounts.set(d.owner_id, (deckCounts.get(d.owner_id) ?? 0) + 1);
  }

  const envAdmins = new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );

  const candidates = authUsers.map((u) => {
    const prof = profileMap.get(u.id);
    const presence = presenceMap.get(u.id);
    const rollup = rollupMap.get(u.id);

    const isBanned = Boolean(u.banned_until && new Date(u.banned_until) > new Date());
    const isEnvAdmin = Boolean(u.email && envAdmins.has(u.email.toLowerCase()));
    const isDbAdmin = adminSet.has(u.id);
    const isAdminUser = isEnvAdmin || isDbAdmin;

    const pStatus = presenceStatus(presence?.last_seen_at);
    const place = presence ? placeLabel(presence) : "Chưa ghi nhận";
    const deviceType = (presence?.device_type as DeviceType) || "unknown";

    return {
      id: u.id,
      email: u.email ?? null,
      displayName: prof?.display_name || prof?.username || "Chưa đặt tên",
      username: prof?.username || "",
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      isBanned,
      isAdmin: isAdminUser,
      envAdmin: isEnvAdmin,
      decks: deckCounts.get(u.id) ?? 0,
      lastSeenAt: presence?.last_seen_at ?? null,
      status: pStatus,
      place,
      deviceType,
      totalXp: rollup?.total_xp ?? 0,
      activeDays: rollup?.active_days ?? 0,
      lastActiveDay: rollup?.last_active_day ?? null,
    };
  });

  const filtered = filterAndSortUsers(candidates, { q, status, sort });
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / USERS_PER_PAGE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * USERS_PER_PAGE;
  const paged = filtered.slice(start, start + USERS_PER_PAGE);

  // Fetch pet summaries only for users in the current page
  const petMap = await getPetSummariesFor(paged.map((u) => u.id));

  const users: AdminUserMonitoring[] = paged.map((u) => {
    const pet = petMap.get(u.id);
    return {
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      username: u.username,
      createdAt: u.createdAt,
      lastSignInAt: u.lastSignInAt,
      banned: u.isBanned,
      admin: u.isAdmin,
      isBanned: u.isBanned,
      isAdmin: u.isAdmin,
      envAdmin: u.envAdmin,
      decks: u.decks,
      lastSeenAt: u.lastSeenAt,
      status: u.status,
      place: u.place,
      deviceType: u.deviceType,
      pet: pet
        ? {
            level: pet.level.level,
            outfit: pet.outfit,
            outfitName: pet.outfitName,
            streak: pet.streak,
          }
        : null,
    };
  });

  return { users, total, totalPages };
}

export type ActivitySummary = {
  onlineNow: number;
  dau: number;
  wau: number;
  mau: number;
  activeByDay: { day: string; active: number }[];
  newByDay: { day: string; count: number }[];
  topCities: { city: string; country: string; users: number }[];
  levelBuckets: LevelBuckets;
  topXp: {
    userId: string;
    displayName: string;
    username: string;
    totalXp: number;
    level: number;
  }[];
};

export async function getActivitySummary(): Promise<ActivitySummary> {
  const sb = createAdminClient();
  const today = studyDay(new Date(), "Asia/Ho_Chi_Minh");
  const twoMinutesAgo = new Date(Date.now() - 2 * 60_000).toISOString();
  const thirtyDaysAgo = addDays(today, -29);
  const fourteenDaysAgo = addDays(today, -13);

  const [
    { count: onlineCount },
    { data: recentStats },
    authUsers,
    { data: recentLogins },
    rollupMap,
    { data: profiles },
  ] = await Promise.all([
    sb.from("user_presence").select("user_id", { count: "exact", head: true }).gte("last_seen_at", twoMinutesAgo),
    sb.from("daily_stats").select("user_id, day, reviews").gte("day", thirtyDaysAgo).gt("reviews", 0),
    allAuthUsers(),
    sb.from("login_events").select("user_id, city, country, created_at").gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString()),
    getRollupMap(),
    sb.from("profiles").select("id, display_name, username"),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // DAU / WAU / MAU
  const { dau, wau, mau } = computeDauWauMau(recentStats ?? [], today);

  // Active by day (14 days)
  const activeCountsByDay = new Map<string, Set<string>>();
  for (const r of recentStats ?? []) {
    if (r.day >= fourteenDaysAgo && r.day <= today) {
      const set = activeCountsByDay.get(r.day) ?? new Set<string>();
      set.add(r.user_id);
      activeCountsByDay.set(r.day, set);
    }
  }

  const activeByDay: { day: string; active: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = addDays(today, -i);
    activeByDay.push({
      day: d,
      active: activeCountsByDay.get(d)?.size ?? 0,
    });
  }

  // New registrations by day (14 days)
  const newCountsByDay = new Map<string, number>();
  for (const u of authUsers) {
    const uDay = studyDay(new Date(u.created_at), "Asia/Ho_Chi_Minh");
    if (uDay >= fourteenDaysAgo && uDay <= today) {
      newCountsByDay.set(uDay, (newCountsByDay.get(uDay) ?? 0) + 1);
    }
  }

  const newByDay: { day: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = addDays(today, -i);
    newByDay.push({
      day: d,
      count: newCountsByDay.get(d) ?? 0,
    });
  }

  // Top cities (30 days) - distinct users per city/country
  const cityUsersMap = new Map<string, { city: string; country: string; users: Set<string> }>();
  for (const l of recentLogins ?? []) {
    if (l.city) {
      const key = `${l.country ?? ""}|${l.city}`;
      const existing = cityUsersMap.get(key) ?? {
        city: l.city,
        country: l.country ?? "",
        users: new Set<string>(),
      };
      existing.users.add(l.user_id);
      cityUsersMap.set(key, existing);
    }
  }

  const topCities = [...cityUsersMap.values()]
    .map((c) => ({
      city: c.city,
      country: c.country,
      users: c.users.size,
    }))
    .sort((a, b) => b.users - a.users)
    .slice(0, 5);

  // Level buckets
  const levelBuckets = bucketLevels([...rollupMap.values()].map((r) => ({ totalXp: r.total_xp })));

  // Top XP (5 users)
  const topXp = [...rollupMap.values()]
    .sort((a, b) => b.total_xp - a.total_xp)
    .slice(0, 5)
    .map((r) => {
      const prof = profileMap.get(r.user_id);
      return {
        userId: r.user_id,
        displayName: prof?.display_name || prof?.username || "Người dùng",
        username: prof?.username || "",
        totalXp: r.total_xp,
        level: levelFromXp(r.total_xp).level,
      };
    });

  return {
    onlineNow: onlineCount ?? 0,
    dau,
    wau,
    mau,
    activeByDay,
    newByDay,
    topCities,
    levelBuckets,
    topXp,
  };
}

export async function getAttention(): Promise<AttentionGroups> {
  const sb = createAdminClient();
  const today = studyDay(new Date(), "Asia/Ho_Chi_Minh");
  const now = Date.now();
  const twentyFourHoursAgo = new Date(now - 24 * 3_600_000).toISOString();
  const aiLimit = serverEnv().AI_DAILY_LIMIT_PER_USER;

  const [authUsers, { data: profiles }, rollupMap, { data: logins24h }, { data: aiUsage }] =
    await Promise.all([
      allAuthUsers(),
      sb.from("profiles").select("id, display_name, username"),
      getRollupMap(),
      sb.from("login_events").select("user_id, country, city, created_at").gte("created_at", twentyFourHoursAgo),
      sb.from("ai_usage").select("user_id, requests").eq("day", today),
    ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const users = authUsers.map((u) => {
    const prof = profileMap.get(u.id);
    const rollup = rollupMap.get(u.id);
    return {
      id: u.id,
      displayName: prof?.display_name || prof?.username || "Người dùng",
      username: prof?.username || "",
      email: u.email ?? null,
      createdAt: u.created_at,
      activeDays: rollup?.active_days ?? 0,
      lastActiveDay: rollup?.last_active_day ?? null,
    };
  });

  const recentLogins24h = (logins24h ?? []).map((l) => ({
    userId: l.user_id,
    country: l.country,
    city: l.city,
    created_at: l.created_at,
  }));

  const aiUsageToday = (aiUsage ?? []).map((a) => ({
    userId: a.user_id,
    requests: a.requests,
  }));

  return computeAttention({
    today,
    now,
    aiLimit,
    users,
    recentLogins24h,
    aiUsageToday,
  });
}
