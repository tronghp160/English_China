import "server-only";
import { capEnrichResult, type EnrichResult } from "@/lib/ai/schemas";
import { verifyChinese } from "@/lib/ai/verify";
import type { LangCode } from "@/lib/lang/types";
import { lookupEnglish } from "./en";
import { lookupChinese } from "./zh";

/**
 * Free dictionary entry shaped like an AI result, so the word form handles both
 * the same way. Used at once while the AI (if any, and if quota is left) fills in more.
 */
export async function lookupFree(language: LangCode, term: string): Promise<EnrichResult | null> {
  if (language === "zh") {
    const raw = await lookupChinese(term);
    if (!raw) return null;
    const { result, checks } = verifyChinese(capEnrichResult(raw, { senses: 6 }));
    return { language: "zh", ...result, checks };
  }
  const raw = await lookupEnglish(term);
  return raw ? { language: "en", ...capEnrichResult(raw, { senses: 8 }), checks: {} } : null;
}
