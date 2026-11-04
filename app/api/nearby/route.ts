import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateDistanceKm } from "@/lib/geo";
import { presenceStatus, type PresenceStatus } from "@/lib/presence";
import { levelFromXp } from "@/lib/progress";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusKm: z.number().min(1).max(200).default(10),
  city: z.string().max(120).optional(),
  region: z.string().max(80).optional(),
});

export type NearbyBuddy = {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  distanceKm: number;
  city: string | null;
  region: string | null;
  status: PresenceStatus;
  level: number;
  lastSeenAt: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as Record<string, unknown> | undefined;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const { latitude, longitude, radiusKm, city, region } = parsed.data;
  const adminClient = createAdminClient();

  // 1. Save user's exact coordinates to their user_presence record
  await adminClient
    .from("user_presence")
    .update({
      latitude,
      longitude,
      last_seen_at: new Date().toISOString(),
      ...(city ? { city } : {}),
      ...(region ? { region } : {}),
    })
    .eq("user_id", userId);

  // 2. Query other users who have recorded locations
  const { data: otherPresences, error } = await adminClient
    .from("user_presence")
    .select("user_id, latitude, longitude, city, region, country, last_seen_at")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .neq("user_id", userId);

  if (error) {
    console.error("[/api/nearby]", error.message);
    return NextResponse.json({ buddies: [], count: 0 });
  }

  // 3. Filter other users by radius using Haversine formula
  const matchingBuddies: {
    userId: string;
    distanceKm: number;
    city: string | null;
    region: string | null;
    lastSeenAt: string;
    status: PresenceStatus;
  }[] = [];

  for (const o of otherPresences ?? []) {
    if (o.latitude != null && o.longitude != null) {
      const dist = calculateDistanceKm(latitude, longitude, o.latitude, o.longitude);
      if (dist <= radiusKm) {
        matchingBuddies.push({
          userId: o.user_id,
          distanceKm: dist,
          city: o.city,
          region: o.region,
          lastSeenAt: o.last_seen_at,
          status: presenceStatus(o.last_seen_at),
        });
      }
    }
  }

  // Sort nearest first and take top 20
  matchingBuddies.sort((a, b) => a.distanceKm - b.distanceKm);
  const topMatches = matchingBuddies.slice(0, 20);

  if (topMatches.length === 0) {
    return NextResponse.json({ buddies: [], count: 0, radiusKm });
  }

  const matchUserIds = topMatches.map((m) => m.userId);

  // 4. Enrich with profiles and XP levels
  const [{ data: profiles }, { data: stats }] = await Promise.all([
    adminClient
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .in("id", matchUserIds),
    adminClient
      .from("daily_stats")
      .select("user_id, xp")
      .in("user_id", matchUserIds),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const xpMap = new Map<string, number>();
  for (const s of stats ?? []) {
    xpMap.set(s.user_id, (xpMap.get(s.user_id) ?? 0) + (s.xp ?? 0));
  }

  const buddies: NearbyBuddy[] = topMatches.map((m) => {
    const prof = profileMap.get(m.userId);
    const totalXp = xpMap.get(m.userId) ?? 0;
    const { level } = levelFromXp(totalXp);

    return {
      userId: m.userId,
      displayName: prof?.display_name || prof?.username || "Bạn học",
      username: prof?.username || "",
      avatarUrl: prof?.avatar_url || null,
      distanceKm: m.distanceKm,
      city: m.city,
      region: m.region,
      status: m.status,
      level,
      lastSeenAt: m.lastSeenAt,
    };
  });

  return NextResponse.json({
    buddies,
    count: buddies.length,
    radiusKm,
  });
}
