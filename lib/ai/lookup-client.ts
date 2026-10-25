import type { LangCode } from "@/lib/lang/types";
import { getCached, putCached, type CacheSource } from "./client-cache";
import type { EnrichResult } from "./schemas";

export type ClientLookup = { result: EnrichResult | null; source: CacheSource | null; fromBrowser: boolean };

/**
 * Free lookup from the browser: the tab's memory first (no request), then
 * /api/lookup (shared AI cache, else the free dictionary). Throws AbortError when aborted.
 */
export async function lookupWord(language: LangCode, term: string, signal?: AbortSignal): Promise<ClientLookup> {
  const hit = getCached(language, term);
  if (hit) return { result: hit.result, source: hit.source, fromBrowser: true };
  let body: { result?: EnrichResult | null; source?: "cache" | "dict" | null } = {};
  try {
    const res = await fetch("/api/lookup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ language, term }),
      signal,
    });
    if (res.ok) body = await res.json().catch(() => ({}));
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
  }
  const result = body.result ?? null;
  const source = result ? (body.source ?? "dict") : null;
  if (result && source) putCached(language, term, { result, source });
  return { result, source, fromBrowser: false };
}
