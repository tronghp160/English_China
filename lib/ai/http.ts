import "server-only";
import { NextResponse } from "next/server";
import type { AiError } from "./enrich";

export const AI_ERROR_STATUS: Record<AiError["code"], number> = {
  not_configured: 503,
  quota_user: 429,
  quota_global: 429,
  failed: 502,
  invalid: 400,
  busy: 503,
};

/** JSON error with `code` and `retryAfter` (busy also sets the Retry-After header). */
export function aiErrorResponse(e: AiError) {
  const retryAfter = e.code === "busy" ? (e.retryAfter ?? 20) : undefined;
  return NextResponse.json(
    { error: e.message, code: e.code, retryAfter: retryAfter ?? null },
    { status: AI_ERROR_STATUS[e.code], headers: retryAfter ? { "Retry-After": String(retryAfter) } : undefined },
  );
}
