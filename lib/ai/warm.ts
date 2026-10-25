import "server-only";
import { normalizeTerm } from "@/lib/lang/normalize";
import type { LangCode } from "@/lib/lang/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROMPT_VERSION } from "./prompts";

/** Recent saved words scanned per warm-up call. */
const RECENT = 200;

/** Distinct words (first spelling wins) whose normalized form is not cached yet. */
export function pickColdTerms(terms: string[], normalize: (t: string) => string, cached: Set<string>) {
  const seen = new Set<string>();
  const cold: string[] = [];
  for (const raw of terms) {
    const term = raw.trim();
    if (!term || term.length > 80) continue;
    const n = normalize(term);
    if (seen.has(n)) continue;
    seen.add(n);
    if (!cached.has(n)) cold.push(term);
  }
  return cold;
}

/** Words people saved recently that have no shared AI answer for the current prompt. */
export async function coldTerms(language: LangCode): Promise<string[]> {
  const admin = createAdminClient();
  const { data: words, error } = await admin
    .from("words")
    .select("term")
    .eq("language", language)
    .order("created_at", { ascending: false })
    .limit(RECENT);
  if (error) throw new Error(error.message);
  const terms = (words ?? []).map((w) => w.term);
  const normalized = [...new Set(terms.map((t) => normalizeTerm(t, language)))];
  if (!normalized.length) return [];
  const { data: rows, error: cacheError } = await admin
    .from("dictionary_cache")
    .select("normalized")
    .eq("language", language)
    .eq("prompt_version", PROMPT_VERSION)
    .in("normalized", normalized);
  if (cacheError) throw new Error(cacheError.message);
  return pickColdTerms(terms, (t) => normalizeTerm(t, language), new Set((rows ?? []).map((r) => r.normalized)));
}

/** The admin whose AI quota a cron warm-up uses: the first one granted in /admin. */
export async function firstAdminId(): Promise<string | null> {
  const { data } = await createAdminClient().from("app_admins").select("user_id").limit(1).maybeSingle();
  return data?.user_id ?? null;
}
