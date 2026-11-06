import "server-only";
import { AiError, checkQuota, QUOTA_GLOBAL_MESSAGE, QUOTA_MESSAGE, quotaDay } from "@/lib/ai/enrich";
import { serverEnv } from "@/lib/env";
import { hitRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

type GateRow = { allowed: boolean; reason: "rate" | "quota_global" | "quota_user" | null; used: number; total: number };

/** Postgres "undefined function" and PostgREST "not in the schema cache": the migration is not applied yet. */
const isMissingFunction = (error: { code?: string }) => error.code === "PGRST202" || error.code === "42883";

/** While the RPC is missing, skip it for this long, then look again (so applying the migration takes effect). */
const MISSING_RETRY_MS = 60_000;
let missingUntil = 0;

const failed = () => new AiError("failed", "Không kiểm tra được hạn mức gợi ý.");

/** The old way: three requests (rate limit, global total, the user's count). Same answers as the RPC. */
async function legacyGate(userId: string, bucket: string, max: number, windowSeconds: number, units: number) {
  const [allowed, quotaError] = await Promise.all([
    hitRateLimit(userId, bucket, max, windowSeconds),
    checkQuota(userId, units).then(
      () => null,
      (e: unknown) => e ?? failed(),
    ),
  ]);
  if (!allowed) return { allowed: false };
  if (quotaError) throw quotaError;
  return { allowed: true };
}

/**
 * Per-minute rate limit and daily AI quota in ONE request to Supabase (RPC `ai_gate`, migration
 * 20261106000018). Counts a rate-limit hit but never a usage unit: record that with `recordUsage` after the answer.
 *
 * - `{ allowed: false }`: rate limited (that is reported before any quota error).
 * - throws `AiError("quota_user" | "quota_global")`: the daily limits.
 * - throws `AiError("failed")` when the quota could not be read (fails closed, like `checkQuota`). The rate limit
 *   alone fails open: the RPC itself ignores a limiter error.
 * - While the RPC does not exist yet (`PGRST202` / `42883`) it falls back to the three old requests, logs once
 *   per minute, and tries the RPC again after a minute.
 */
export async function aiGate(userId: string, bucket: string, max: number, windowSeconds: number, units = 1): Promise<{ allowed: boolean }> {
  if (Date.now() >= missingUntil) {
    const env = serverEnv();
    const { data, error } = await createAdminClient().rpc("ai_gate", {
      p_user_id: userId,
      p_bucket: bucket,
      p_window_seconds: windowSeconds,
      p_max: max,
      p_day: quotaDay(),
      p_units: units,
      p_user_limit: env.AI_DAILY_LIMIT_PER_USER,
      p_global_limit: env.AI_GLOBAL_DAILY_LIMIT,
    });
    if (error) {
      if (!isMissingFunction(error)) {
        console.error("[ai-gate]", error.message);
        throw failed();
      }
      missingUntil = Date.now() + MISSING_RETRY_MS;
      console.warn("[ai-gate] RPC ai_gate is missing (run pnpm db:push); using the three old queries");
    } else {
      const g = data as GateRow | null;
      if (!g || typeof g.allowed !== "boolean") throw failed();
      if (g.allowed) return { allowed: true };
      if (g.reason === "quota_global") throw new AiError("quota_global", QUOTA_GLOBAL_MESSAGE);
      if (g.reason === "quota_user") throw new AiError("quota_user", QUOTA_MESSAGE);
      return { allowed: false }; // "rate"
    }
  }
  return legacyGate(userId, bucket, max, windowSeconds, units);
}
