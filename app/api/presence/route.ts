import { NextResponse } from "next/server";
import { z } from "zod";
import { parseUserAgent, readRequestMeta } from "@/lib/presence";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({ path: z.string().max(200).startsWith("/") });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const lastBeat = new Map<string, number>(); // per server instance: drop bursts under 5s without touching the database

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as Record<string, unknown> | undefined;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;
  if (!userId) return new NextResponse(null, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });

  const now = Date.now();
  if (now - (lastBeat.get(userId) ?? 0) < 5_000) return new NextResponse(null, { status: 204 });
  lastBeat.set(userId, now);
  if (lastBeat.size > 5_000) lastBeat.clear();

  const meta = readRequestMeta(request.headers);
  const device = parseUserAgent(request.headers.get("user-agent"));
  const rawSession = claims?.session_id;
  const { error } = await createAdminClient().rpc("record_presence", {
    p_user_id: userId,
    p_path: parsed.data.path.split("?")[0].split("#")[0],
    p_session_id: typeof rawSession === "string" && UUID.test(rawSession) ? rawSession : undefined,
    p_ip: meta.ip ?? undefined,
    p_country: meta.country ?? undefined,
    p_region: meta.region ?? undefined,
    p_city: meta.city ?? undefined,
    p_latitude: meta.latitude ?? undefined,
    p_longitude: meta.longitude ?? undefined,
    p_timezone: meta.timezone ?? undefined,
    p_device_type: device.deviceType,
    p_browser: device.browser,
    p_os: device.os,
    p_user_agent: request.headers.get("user-agent")?.slice(0, 400) ?? undefined,
  });
  // Never break the app because of tracking (e.g. the account was just deleted: foreign key error).
  if (error) console.error("[presence]", error.message);
  return new NextResponse(null, { status: 204, headers: { "cache-control": "no-store" } });
}
