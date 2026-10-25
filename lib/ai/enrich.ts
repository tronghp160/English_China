import "server-only";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { APICallError, generateText, NoObjectGeneratedError, Output } from "ai";
import { after } from "next/server";
import { z } from "zod";
import { aiProvider, serverEnv, type AiProvider } from "@/lib/env";
import { normalizeTerm } from "@/lib/lang/normalize";
import type { LangCode } from "@/lib/lang/types";
import { hitGlobalLimit } from "@/lib/rate-limit";
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
    public code: "not_configured" | "quota_user" | "quota_global" | "failed" | "invalid" | "busy",
    message: string,
    /** Seconds to wait before asking again (busy only). */
    public retryAfter?: number,
  ) {
    super(message);
  }
}

export const QUOTA_MESSAGE =
  "Bạn đã dùng hết lượt gợi ý hôm nay. Bạn vẫn có thể tự nhập, lượt gợi ý sẽ có lại vào ngày mai.";

export const BUSY_MESSAGE = "AI đang bận vì nhiều người dùng. Đã điền từ từ điển, AI sẽ tự bổ sung sau ít giây.";
const DEFAULT_RETRY_AFTER = 20;

/** Seconds until the next whole minute, when the per-minute limiter window resets. */
export function secondsToNextMinute(now = Date.now()) {
  return Math.max(1, 60 - (Math.floor(now / 1000) % 60));
}

function parseRetryAfter(e: APICallError): number | undefined {
  const header = e.responseHeaders?.["retry-after"] ?? e.responseHeaders?.["Retry-After"];
  const fromHeader = header ? Number(header) : NaN;
  if (Number.isFinite(fromHeader) && fromHeader > 0) return Math.ceil(fromHeader);
  // Google puts the wait in the body: "retryDelay": "17s" (sometimes "17.2s").
  const m = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(e.responseBody ?? "");
  return m ? Math.ceil(Number(m[1])) : undefined;
}

/** A provider "too many requests" / overloaded answer, possibly wrapped by the SDK. */
export function isRateLimited(e: unknown, depth = 0): { limited: boolean; retryAfter?: number } {
  if (!e || depth > 3) return { limited: false };
  if (APICallError.isInstance(e)) {
    const text = `${e.message} ${e.responseBody ?? ""}`;
    if (e.statusCode === 429 || e.statusCode === 503 || /RESOURCE_EXHAUSTED|rate limit|quota/i.test(text)) {
      return { limited: true, retryAfter: parseRetryAfter(e) ?? DEFAULT_RETRY_AFTER };
    }
    return { limited: false };
  }
  const err = e as { lastError?: unknown; cause?: unknown; message?: unknown };
  if (err.lastError) return isRateLimited(err.lastError, depth + 1);
  if (err.cause) return isRateLimited(err.cause, depth + 1);
  if (typeof err.message === "string" && /RESOURCE_EXHAUSTED|rate limit|quota exceeded|too many requests/i.test(err.message)) {
    return { limited: true, retryAfter: DEFAULT_RETRY_AFTER };
  }
  return { limited: false };
}

function schemaFor(lang: LangCode) {
  return lang === "zh" ? EnrichResultZH : EnrichResultEN;
}

/** Calendar day in Vietnam time, used for AI quotas. */
function quotaDay() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

export function requireProvider(): AiProvider {
  const p = aiProvider();
  if (!p) throw new AiError("not_configured", "Tính năng Gợi ý AI chưa được bật (thiếu ANTHROPIC_API_KEY hoặc GOOGLE_GENERATIVE_AI_API_KEY).");
  return p;
}

export function model(p: AiProvider, name = p.model) {
  return p.provider === "google"
    ? createGoogleGenerativeAI({ apiKey: p.apiKey })(name)
    : createAnthropic({ apiKey: p.apiKey })(name);
}

// Haiku 5.5 rejects non-default sampling values, so the plan's temperature 0.2–0.3
// is replaced by low effort (short thinking keeps the ≤ 5 s target).
// Gemini: @ai-sdk/google types thinkingLevel "minimal" | "low" | "medium" | "high"
// (and thinkingBudget). "minimal" is the fastest and spends the least of the
// free-tier token budget; a model that rejects it is called again without any
// thinking config (the provider then uses that model's default) and remembered.
const PROVIDER_OPTIONS = {
  anthropic: { effort: "low" as const, structuredOutputMode: "outputFormat" as const },
  google: { thinkingConfig: { thinkingLevel: "minimal" as const } },
};
const PROVIDER_OPTIONS_PLAIN = { anthropic: PROVIDER_OPTIONS.anthropic };
const noThinkingConfig = new Set<string>();

/** A 400 from Google about the thinking settings (model does not support that level). */
function rejectsThinkingConfig(e: unknown) {
  return APICallError.isInstance(e) && e.statusCode === 400 && /thinking/i.test(`${e.message} ${e.responseBody ?? ""}`);
}

export function finalize(lang: LangCode, raw: EnrichEN | EnrichZH): EnrichResult {
  if (lang === "zh") {
    const capped = capEnrichResult(raw as EnrichZH);
    const { result, checks } = verifyChinese(capped);
    return { language: "zh", ...result, checks };
  }
  return { language: "en", ...capEnrichResult(raw as EnrichEN), checks: {} };
}

/**
 * Reads the global and per-user counters in parallel and throws a quota error
 * before any model call. Returns how many calls the user has made today.
 */
export async function checkQuota(userId: string, units = 1): Promise<number> {
  const env = serverEnv();
  const admin = createAdminClient();
  const day = quotaDay();
  const [total, mine] = await Promise.all([
    admin.rpc("ai_usage_total", { p_day: day }),
    admin.from("ai_usage").select("requests").eq("user_id", userId).eq("day", day).maybeSingle(),
  ]);
  if (total.error || mine.error) throw new AiError("failed", "Không kiểm tra được hạn mức gợi ý.");
  if ((total.data ?? 0) + units > env.AI_GLOBAL_DAILY_LIMIT) {
    throw new AiError("quota_global", "Hệ thống đã dùng hết lượt gợi ý hôm nay. Bạn vẫn có thể tự nhập từ.");
  }
  const used = mine.data?.requests ?? 0;
  if (used + units > env.AI_DAILY_LIMIT_PER_USER) throw new AiError("quota_user", QUOTA_MESSAGE);
  return used;
}

/** Counts usage after a successful model call, once the response has been sent. */
export function recordUsage(userId: string, units = 1): void {
  const run = async () => {
    const admin = createAdminClient();
    const day = quotaDay();
    const results = await Promise.all(
      Array.from({ length: units }, () => admin.rpc("increment_ai_usage", { p_user_id: userId, p_day: day })),
    );
    for (const { error } of results) if (error) console.error("[ai] usage", error.message);
  };
  try {
    after(run);
  } catch {
    // Outside a request (scripts, tests): count right away.
    void run().catch((e) => console.error("[ai] usage", e));
  }
}

/** Throws "busy" once the whole app has used its per-minute share of the provider. */
async function guardRpm() {
  if (!(await hitGlobalLimit("ai_rpm", serverEnv().AI_RPM_LIMIT, 60))) {
    throw new AiError("busy", BUSY_MESSAGE, secondsToNextMinute());
  }
}

/** Shared AI answer from dictionary_cache, or null. The hit count is bumped in the background. */
export async function readCachedEnrich(lang: LangCode, normalized: string): Promise<EnrichResult | null> {
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

async function writeCache(lang: LangCode, normalized: string, result: EnrichResult, modelName: string) {
  if (!result.is_valid_word) return; // never cache typos
  await createAdminClient()
    .from("dictionary_cache")
    .upsert(
      {
        language: lang,
        normalized,
        payload: result as unknown as Json,
        model: modelName,
        prompt_version: PROMPT_VERSION,
      },
      { onConflict: "language,normalized,prompt_version", ignoreDuplicates: true },
    );
}

/**
 * One structured call, trying the main model then each fallback (Gemini's free
 * tier limits each model separately). No SDK retries: an instant retry after a
 * 429 only burns more of the minute's allowance.
 */
export async function callModel<T>(
  schema: z.ZodType<T>,
  system: string,
  prompt: string,
  maxOutputTokens: number,
): Promise<{ output: T; model: string }> {
  const p = requireProvider();
  let retryAfter: number | undefined;
  let lastError: unknown;
  for (const name of [p.model, ...p.fallbacks]) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const plain = p.provider !== "google" || noThinkingConfig.has(name);
      try {
        const res = await generateText({
          model: model(p, name),
          system,
          prompt,
          output: Output.object({ schema }),
          maxOutputTokens,
          maxRetries: 0,
          timeout: 25_000,
          providerOptions: plain ? PROVIDER_OPTIONS_PLAIN : PROVIDER_OPTIONS,
        });
        console.info(
          `[ai] ${p.provider}/${name} input=${res.usage.inputTokens ?? "?"} output=${res.usage.outputTokens ?? "?"} attempt=${attempt + 1}`,
        );
        return { output: res.output, model: name };
      } catch (e) {
        lastError = e;
        if (!plain && rejectsThinkingConfig(e)) {
          console.warn(`[ai] model=${name} rejects thinkingConfig, retrying without it`);
          noThinkingConfig.add(name);
          attempt--;
          continue;
        }
        const limit = isRateLimited(e);
        if (limit.limited) {
          console.warn(`[ai] rate-limited model=${name} retryAfter=${limit.retryAfter}`);
          retryAfter = Math.min(retryAfter ?? Infinity, limit.retryAfter ?? DEFAULT_RETRY_AFTER);
          break; // next model
        }
        // Retry the same model once only when its output failed the schema, then move on.
        if (NoObjectGeneratedError.isInstance(e)) continue;
        console.error("[ai] enrichment failed", e);
        throw new AiError("failed", "Không lấy được gợi ý lúc này. Thử lại hoặc tự nhập.");
      }
    }
  }
  if (retryAfter !== undefined) throw new AiError("busy", BUSY_MESSAGE, retryAfter);
  console.error("[ai] enrichment failed", lastError);
  throw new AiError("failed", "Không lấy được gợi ý lúc này. Thử lại hoặc tự nhập.");
}

export type EnrichOutcome = {
  result: EnrichResult;
  cached: boolean;
  /** AI calls left today; null on a cache hit (not worth a database read). */
  remaining: number | null;
};

/** The same word asked twice at once on this instance costs one model call. */
const inflight = new Map<string, Promise<EnrichOutcome>>();

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
  // A context sentence picks the sense: never read or write the shared cache then.
  const context = opts.context?.trim() || null;
  if (context) return enrichFresh(opts.userId, opts.language, term, normalized, context);

  const key = `${opts.language}:${normalized}`;
  const running = inflight.get(key);
  if (running) return running;
  const job = (async (): Promise<EnrichOutcome> => {
    const hit = await readCachedEnrich(opts.language, normalized);
    if (hit) return { result: hit, cached: true, remaining: null };
    return enrichFresh(opts.userId, opts.language, term, normalized, null);
  })();
  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}

async function enrichFresh(
  userId: string,
  language: LangCode,
  term: string,
  normalized: string,
  context: string | null,
): Promise<EnrichOutcome> {
  requireProvider();
  const used = await checkQuota(userId);
  await guardRpm();
  const { output, model: usedModel } = await callModel(
    schemaFor(language) as z.ZodType<EnrichEN | EnrichZH>,
    systemPrompt(language),
    userPrompt(language, term, context),
    3500,
  );
  recordUsage(userId);
  const result = finalize(language, output);
  if (!context) await writeCache(language, normalized, result, usedModel);
  return { result, cached: false, remaining: Math.max(serverEnv().AI_DAILY_LIMIT_PER_USER - used - 1, 0) };
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
      const hit = await readCachedEnrich(language, it.normalized);
      if (hit) outcomes.set(i, { term: it.term, ok: true, result: hit, cached: true });
      else misses.push(i);
    }),
  );
  misses.sort((a, b) => a - b);

  if (misses.length) {
    requireProvider();
    await checkQuota(userId, misses.length);
    // Google counts requests, not words: one hit for the whole batch.
    await guardRpm();
    const schema = z.object({ entries: z.array(schemaFor(language) as z.ZodType<EnrichEN | EnrichZH>) });
    try {
      const { output: raw, model: usedModel } = await callModel(
        schema,
        systemPrompt(language),
        batchPrompt(language, misses.map((i) => keyed[i])),
        Math.min(2200 * misses.length + 1000, 32_000),
      );
      recordUsage(userId, misses.length);
      await Promise.all(
        misses.map(async (idx, j) => {
          const entry = raw.entries[j];
          if (!entry) {
            outcomes.set(idx, { term: keyed[idx].term, ok: false, error: "Không có kết quả" });
            return;
          }
          const result = finalize(language, entry);
          outcomes.set(idx, { term: keyed[idx].term, ok: true, result, cached: false });
          await writeCache(language, keyed[idx].normalized, result, usedModel);
        }),
      );
    } catch (e) {
      // Busy is answered for the whole batch (503 + Retry-After) so the client queue resends it.
      if (e instanceof AiError && e.code === "busy") throw e;
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
