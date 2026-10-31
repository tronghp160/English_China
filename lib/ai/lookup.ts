import "server-only";
import { lookupFree } from "@/lib/dict";
import { normalizeTerm } from "@/lib/lang/normalize";
import type { LangCode } from "@/lib/lang/types";
import { readCachedEnrich } from "./enrich";
import type { EnrichResult } from "./schemas";

export type LookupSource = "cache" | "dict";
export type LookupOutcome = { result: EnrichResult | null; source: LookupSource | null };

/**
 * Best answer that costs no AI quota: a shared AI answer someone already paid for
 * (dictionary_cache), else the free dictionary. Both are asked in parallel.
 */
export async function lookupBest(
  language: LangCode,
  term: string,
  opts: { timeoutMs?: number } = {},
): Promise<LookupOutcome> {
  const [cached, dict] = await Promise.all([
    readCachedEnrich(language, normalizeTerm(term, language)).catch((e) => {
      console.error("[lookup] cache", e);
      return null;
    }),
    lookupFree(language, term, opts).catch((e) => {
      console.error("[lookup] dict", e);
      return null;
    }),
  ]);
  if (cached) return { result: cached, source: "cache" };
  if (dict) return { result: dict, source: "dict" };
  return { result: null, source: null };
}
