import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Fixed-window limiter backed by Postgres (works across serverless instances). */
export async function hitRateLimit(userId: string, bucket: string, max: number, windowSeconds: number) {
  const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
    p_user_id: userId,
    p_bucket: bucket,
    p_window_seconds: windowSeconds,
    p_max: max,
  });
  if (error) {
    console.error("[rate-limit]", error.message);
    return true; // fail open: a limiter outage should not block the app
  }
  return Boolean(data);
}
