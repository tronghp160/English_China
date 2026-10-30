import "server-only";
import { cache } from "react";
import { getUser } from "@/lib/auth";
import { addDays, computeStreak, studyDay } from "@/lib/srs/streak";
import { createClient } from "@/lib/supabase/server";

const GROUP_TZ = "Asia/Ho_Chi_Minh";

/** Groups the current user belongs to, with member / deck counts. */
export const getMyGroups = cache(async () => {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_groups");
  return data ?? [];
});

/** One group the current user is a member of (RLS), with members, decks and leaderboard. */
export const getGroup = cache(async (groupId: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(groupId)) return null;
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data: group } = await supabase
    .from("groups")
    .select("id, name, description, owner_id, invite_code, created_at")
    .eq("id", groupId)
    .maybeSingle();
  if (!group) return null;

  const [{ data: members }, { data: decks }, { data: leaderboard }, { data: activity }] = await Promise.all([
    supabase
      .from("group_members")
      .select("user_id, role, joined_at, profile:profiles(id, display_name, username, avatar_url)")
      .eq("group_id", groupId)
      .order("joined_at"),
    supabase
      .from("decks")
      .select("id, name, language, word_count, owner_id, allow_member_edit, owner:profiles!decks_owner_id_fkey(display_name)")
      .eq("group_id", groupId)
      .eq("visibility", "group")
      .order("updated_at", { ascending: false }),
    supabase.rpc("weekly_leaderboard", { p_group_id: groupId }),
    supabase.rpc("group_activity", { p_group_id: groupId, p_limit: 30 }),
  ]);

  const memberIds = (members ?? []).map((m) => m.user_id);
  const streaks = await getStreaks(memberIds);

  return {
    group,
    isOwner: group.owner_id === user.id,
    userId: user.id,
    members: (members ?? []).filter((m) => m.profile),
    decks: decks ?? [],
    leaderboard: (leaderboard ?? []).map((r) => ({ ...r, streak: streaks.get(r.user_id) ?? 0 })),
    activity: buildFeed(activity ?? [], members ?? [], streaks),
  };
});

export type GroupView = NonNullable<Awaited<ReturnType<typeof getGroup>>>;

/** Current streak per member, from group mates' daily_stats and bin_freezes (readable under RLS). */
async function getStreaks(userIds: string[]) {
  const out = new Map<string, number>();
  if (!userIds.length) return out;
  const today = studyDay(new Date(), GROUP_TZ);
  const supabase = await createClient();
  const [{ data: statsData }, { data: freezesData }] = await Promise.all([
    supabase
      .from("daily_stats")
      .select("user_id, day")
      .in("user_id", userIds)
      .gt("reviews", 0)
      .gte("day", addDays(today, -120)),
    supabase
      .from("bin_freezes")
      .select("user_id, day")
      .in("user_id", userIds)
      .gte("day", addDays(today, -120)),
  ]);
  const days = new Map<string, string[]>();
  for (const r of statsData ?? []) days.set(r.user_id, [...(days.get(r.user_id) ?? []), r.day]);
  const freezes = new Map<string, string[]>();
  for (const r of freezesData ?? []) freezes.set(r.user_id, [...(freezes.get(r.user_id) ?? []), r.day]);
  for (const id of userIds) {
    out.set(id, computeStreak(days.get(id) ?? [], today, freezes.get(id) ?? []).current);
  }
  return out;
}

export type FeedItem =
  | { kind: "words"; key: string; name: string; deckId: string; deckName: string; n: number; at: string }
  | { kind: "joined" | "created"; key: string; name: string; at: string }
  | { kind: "streak"; key: string; name: string; n: number };

const STREAK_MIN = 3;

function buildFeed(
  rows: { kind: string; user_id: string; display_name: string; deck_id: string | null; deck_name: string | null; n: number; at: string }[],
  members: { user_id: string; profile: { display_name: string } | null }[],
  streaks: Map<string, number>,
): FeedItem[] {
  const items: FeedItem[] = rows.map((r, i) =>
    r.kind === "words"
      ? { kind: "words", key: `w${i}`, name: r.display_name, deckId: r.deck_id!, deckName: r.deck_name!, n: r.n, at: r.at }
      : { kind: r.kind === "created" ? "created" : "joined", key: `m${i}`, name: r.display_name, at: r.at },
  );
  const streakItems: FeedItem[] = members
    .filter((m) => m.profile && (streaks.get(m.user_id) ?? 0) >= STREAK_MIN)
    .map((m): FeedItem & { kind: "streak" } => ({ kind: "streak", key: `s${m.user_id}`, name: m.profile!.display_name, n: streaks.get(m.user_id)! }))
    .sort((a, b) => b.n - a.n);
  return [...streakItems, ...items];
}
