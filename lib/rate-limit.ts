import "server-only";
import { createHash } from "node:crypto";
import { serverEnv } from "@/lib/env";
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

/** Salted hash so raw client IPs are never stored. */
export function hashClientKey(ip: string) {
  return createHash("sha256").update(`${serverEnv().SUPABASE_SERVICE_ROLE_KEY}:${ip}`).digest("hex");
}

/**
 * Same limiter for requests without a user (sign-up), keyed by client IP.
 * Fails closed: these buckets guard account creation, so an outage blocks it.
 */
export async function hitIpRateLimit(ip: string, bucket: string, max: number, windowSeconds: number) {
  const { data, error } = await createAdminClient().rpc("hit_ip_rate_limit", {
    p_key_hash: hashClientKey(ip),
    p_bucket: bucket,
    p_window_seconds: windowSeconds,
    p_max: max,
  });
  if (error) {
    console.error("[rate-limit:ip]", error.message);
    return false;
  }
  return Boolean(data);
}

/** App-wide limiter (not per user). Fails open: an outage must not block suggestions. */
export async function hitGlobalLimit(bucket: string, max: number, windowSeconds: number) {
  const { data, error } = await createAdminClient().rpc("hit_ip_rate_limit", {
    p_key_hash: "global",
    p_bucket: bucket,
    p_window_seconds: windowSeconds,
    p_max: max,
  });
  if (error) {
    console.error("[rate-limit:global]", error.message);
    return true;
  }
  return Boolean(data);
}
