import "server-only";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { aiProvider, serverEnv, type AiProvider } from "@/lib/env";
import { normalizeTerm } from "@/lib/lang/normalize";
import type { LangCode } from "@/lib/lang/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { batchPrompt, PROMPT_VERSION, systemPrompt, userPrompt } from "./prompts";
import {
  capEnrichResult,
  EnrichResultEN,
  EnrichResultZH,
  type EnrichEN,
  type EnrichResult,
  type EnrichZH,
} from "./schemas";
import { verifyChinese } from "./verify";

export class AiError extends Error {
  constructor(
    public code: "not_configured" | "quota_user" | "quota_global" | "failed" | "invalid",
    message: string,
  ) {
    super(message);
  }
}

export const QUOTA_MESSAGE =
  "Bạn đã dùng hết lượt gợi ý hôm nay. Bạn vẫn có thể tự nhập, lượt gợi ý sẽ có lại vào ngày mai.";

function schemaFor(lang: LangCode) {
  return lang === "zh" ? EnrichResultZH : EnrichResultEN;
}

/** Calendar day in Vietnam time, used for AI quotas. */
function quotaDay() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

function requireProvider(): AiProvider {
  const p = aiProvider();
  if (!p) throw new AiError("not_configured", "Tính năng Gợi ý AI chưa được bật (thiếu ANTHROPIC_API_KEY hoặc GOOGLE_GENERATIVE_AI_API_KEY).");
  return p;
}

function model(p: AiProvider) {
  return p.provider === "google"
    ? createGoogleGenerativeAI({ apiKey: p.apiKey })(p.model)
    : createAnthropic({ apiKey: p.apiKey })(p.model);
}

// Haiku 5.5 rejects non-default sampling values, so the plan's temperature 0.2–0.3
// is replaced by low effort (short thinking keeps the ≤ 5 s target).
// Gemini: low thinking keeps answers quick on the free tier.
const PROVIDER_OPTIONS = {
  anthropic: { effort: "low" as const, structuredOutputMode: "outputFormat" as const },
  google: { thinkingConfig: { thinkingLevel: "low" as const } },
};

export function finalize(lang: LangCode, raw: EnrichEN | EnrichZH): EnrichResult {
  if (lang === "zh") {
    const capped = capEnrichResult(raw as EnrichZH);
    const { result, checks } = verifyChinese(capped);
    return { language: "zh", ...result, checks };
  }
  return { language: "en", ...capEnrichResult(raw as EnrichEN), checks: {} };
}

/** Atomically count one AI call (per user) and enforce per-user + global daily limits. */
export async function chargeQuota(userId: string, units = 1) {
  const env = serverEnv();
  const admin = createAdminClient();
  const day = quotaDay();
  const { data: total } = await admin.rpc("ai_usage_total", { p_day: day });
  if ((total ?? 0) + units > env.AI_GLOBAL_DAILY_LIMIT) {
    throw new AiError("quota_global", "Hệ thống đã dùng hết lượt gợi ý hôm nay. Bạn vẫn có thể tự nhập từ.");
  }
  let used = 0;
  for (let i = 0; i < units; i++) {
    const { data, error } = await admin.rpc("increment_ai_usage", { p_user_id: userId, p_day: day });
    if (error) throw new AiError("failed", "Không kiểm tra được hạn mức gợi ý.");
    used = data ?? 0;
  }
  if (used > env.AI_DAILY_LIMIT_PER_USER) throw new AiError("quota_user", QUOTA_MESSAGE);
}

export async function remainingQuota(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("ai_usage")
    .select("requests")
    .eq("user_id", userId)
    .eq("day", quotaDay())
    .maybeSingle();
  return Math.max(serverEnv().AI_DAILY_LIMIT_PER_USER - (data?.requests ?? 0), 0);
}

async function readCache(lang: LangCode, normalized: string): Promise<EnrichResult | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("dictionary_cache")
    .select("payload")
    .eq("language", lang)
    .eq("normalized", normalized)
    .eq("prompt_version", PROMPT_VERSION)
    .maybeSingle();
  if (!data) return null;
  void admin.rpc("cache_hit", { p_language: lang, p_normalized: normalized, p_prompt_version: PROMPT_VERSION });
  return data.payload as unknown as EnrichResult;
}

async function writeCache(lang: LangCode, normalized: string, result: EnrichResult) {
  if (!result.is_valid_word) return; // never cache typos
  await createAdminClient()
    .from("dictionary_cache")
    .upsert(
      {
        language: lang,
        normalized,
        payload: result as unknown as Json,
        model: aiProvider()?.model ?? "unknown",
        prompt_version: PROMPT_VERSION,
      },
      { onConflict: "language,normalized,prompt_version", ignoreDuplicates: true },
    );
}

async function callModel<T>(schema: z.ZodType<T>, system: string, prompt: string, maxOutputTokens: number): Promise<T> {
  const p = requireProvider();
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await generateText({
        model: model(p),
        system,
        prompt,
        output: Output.object({ schema }),
        maxOutputTokens,
        maxRetries: 1,
        timeout: 25_000,
        providerOptions: PROVIDER_OPTIONS,
      });
      console.info(
        `[ai] ${p.provider}/${p.model} input=${res.usage.inputTokens ?? "?"} output=${res.usage.outputTokens ?? "?"} attempt=${attempt + 1}`,
      );
      return res.output;
    } catch (e) {
      lastError = e;
      // Retry once only when the model produced output that failed the schema.
      if (!NoObjectGeneratedError.isInstance(e)) break;
    }
  }
  console.error("[ai] enrichment failed", lastError);
  throw new AiError("failed", "Không lấy được gợi ý lúc này. Thử lại hoặc tự nhập.");
}

export type EnrichOutcome = { result: EnrichResult; cached: boolean };

/** Single word (§7.1). Cache hits never count toward the quota. */
export async function enrichTerm(opts: {
  userId: string;
  language: LangCode;
  term: string;
  context?: string | null;
}): Promise<EnrichOutcome> {
  const term = opts.term.trim();
  if (!term || term.length > 80) throw new AiError("invalid", "Từ không hợp lệ.");
  const normalized = normalizeTerm(term, opts.language);
  const useCache = !opts.context?.trim();

  if (useCache) {
    const hit = await readCache(opts.language, normalized);
    if (hit) return { result: hit, cached: true };
  }
  requireProvider();
  await chargeQuota(opts.userId);

  const raw = await callModel(
    schemaFor(opts.language) as z.ZodType<EnrichEN | EnrichZH>,
    systemPrompt(opts.language),
    userPrompt(opts.language, term, opts.context),
    6000,
  );
  const result = finalize(opts.language, raw);
  if (useCache) await writeCache(opts.language, normalized, result);
  return { result, cached: false };
}

export type BatchItem = { term: string; meaning_vi?: string | null };
export type BatchOutcome = { term: string; ok: true; result: EnrichResult; cached: boolean } | { term: string; ok: false; error: string };

/** Up to 10 words in one model call (§7.7). Only uncached words count toward the quota. */
export async function enrichBatch(userId: string, language: LangCode, items: BatchItem[]): Promise<BatchOutcome[]> {
  if (!items.length || items.length > 10) throw new AiError("invalid", "Mỗi lô tối đa 10 từ.");
  const keyed = items.map((it) => ({ ...it, term: it.term.trim(), normalized: normalizeTerm(it.term, language) }));

  const outcomes = new Map<number, BatchOutcome>();
  const misses: number[] = [];
  await Promise.all(
    keyed.map(async (it, i) => {
      const hit = await readCache(language, it.normalized);
      if (hit) outcomes.set(i, { term: it.term, ok: true, result: hit, cached: true });
      else misses.push(i);
    }),
  );
  misses.sort((a, b) => a - b);

  if (misses.length) {
    requireProvider();
    await chargeQuota(userId, misses.length);
    const schema = z.object({ entries: z.array(schemaFor(language) as z.ZodType<EnrichEN | EnrichZH>) });
    try {
      const raw = await callModel(
        schema,
        systemPrompt(language),
        batchPrompt(language, misses.map((i) => keyed[i])),
        Math.min(2200 * misses.length + 1000, 32_000),
      );
      await Promise.all(
        misses.map(async (idx, j) => {
          const entry = raw.entries[j];
          if (!entry) {
            outcomes.set(idx, { term: keyed[idx].term, ok: false, error: "Không có kết quả" });
            return;
          }
          const result = finalize(language, entry);
          outcomes.set(idx, { term: keyed[idx].term, ok: true, result, cached: false });
          await writeCache(language, keyed[idx].normalized, result);
        }),
      );
    } catch (e) {
      const msg = e instanceof AiError ? e.message : "Lỗi gợi ý";
      for (const idx of misses) outcomes.set(idx, { term: keyed[idx].term, ok: false, error: msg });
    }
  }
  return keyed.map((_, i) => outcomes.get(i)!);
}

/** Photo import (OCR) still needs Claude vision. */
export function requireAnthropicKeyOrThrow() {
  if (!serverEnv().ANTHROPIC_API_KEY) {
    throw new AiError("not_configured", "Tính năng Gợi ý chưa được bật (thiếu ANTHROPIC_API_KEY).");
  }
}
