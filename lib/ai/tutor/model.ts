import "server-only";
import { APICallError, wrapLanguageModel, type LanguageModelMiddleware } from "ai";
import { isRateLimited, model as modelFor } from "@/lib/ai/enrich";
import { serverEnv, type AiProvider } from "@/lib/env";

type ProviderModel = ReturnType<typeof modelFor>;

/** Model names the tutor may use, in order: the chat model (if set), then the main model and its fallbacks. */
export function chatModelNames(p: AiProvider, chatModel: string | undefined): string[] {
  const names = p.provider === "google" && chatModel ? [chatModel, p.model, ...p.fallbacks] : [p.model, ...p.fallbacks];
  return [...new Set(names.map((n) => n.trim()).filter(Boolean))];
}

/** A 400 from Google about the thinking settings (the model does not support that level). */
export function rejectsThinking(e: unknown): boolean {
  return APICallError.isInstance(e) && e.statusCode === 400 && /thinking/i.test(`${e.message} ${e.responseBody ?? ""}`);
}

type CallParams = Parameters<ProviderModel["doStream"]>[0];

/** Same call without Google's thinkingConfig (the model then uses its own default). */
function withoutThinking(params: CallParams): CallParams {
  const google = params.providerOptions?.google;
  if (!google || !("thinkingConfig" in google)) return params;
  const rest = { ...google };
  delete rest.thinkingConfig;
  return { ...params, providerOptions: { ...params.providerOptions, google: rest } };
}

const thinkingLevel = (params: CallParams) =>
  (params.providerOptions?.google as { thinkingConfig?: { thinkingLevel?: string } } | undefined)?.thinkingConfig
    ?.thinkingLevel;

/** Same call with another Google thinking level. */
function withThinkingLevel(params: CallParams, level: string): CallParams {
  const google = params.providerOptions?.google as { thinkingConfig?: Record<string, unknown> } | undefined;
  if (!google?.thinkingConfig) return params;
  return {
    ...params,
    providerOptions: { ...params.providerOptions, google: { ...google, thinkingConfig: { ...google.thinkingConfig, thinkingLevel: level } } },
  } as CallParams;
}

/** Per model id, while this instance lives: until when to skip it (it answered 429/503 or hung). */
const cooldownUntil = new Map<string, number>();
/** Per model id: thinking levels it rejected (some models have no "minimal"). */
const rejectedLevels = new Map<string, Set<string>>();

/** For tests. */
export function resetTutorCooldown() {
  cooldownUntil.clear();
  rejectedLevels.clear();
}

function coolDown(modelId: string, seconds: number) {
  cooldownUntil.set(modelId, Date.now() + Math.min(120, Math.max(10, seconds)) * 1000);
}

/** A model with another one after it gets this long to start answering before the next one is tried. */
export const FIRST_BYTE_MS = 15_000;

class FirstByteTimeout extends Error {
  constructor(modelId: string, ms: number) {
    super(`${modelId} sent nothing in ${ms / 1000} s`);
    this.name = "FirstByteTimeout";
  }
}

/** doStream, given up after `firstByteMs` if the model has not answered (headers) by then. */
async function doStreamWithin(m: ProviderModel, params: CallParams, firstByteMs?: number) {
  if (!firstByteMs) return m.doStream(params);
  const ctrl = new AbortController();
  const outer = params.abortSignal;
  const forward = () => ctrl.abort(outer?.reason);
  if (outer?.aborted) forward();
  else outer?.addEventListener("abort", forward, { once: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new FirstByteTimeout(m.modelId, firstByteMs));
      ctrl.abort(); // the signal also covers the stream, so only abort once the call is given up
    }, firstByteMs);
  });
  try {
    return await Promise.race([m.doStream({ ...params, abortSignal: ctrl.signal }), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Starts a stream on one model. A model that rejects the thinking level is remembered and asked
 * again: with "low" instead of "minimal" (gemini-3.8-flash has no "minimal"), else without thinkingConfig.
 */
async function streamOn(m: ProviderModel, params: CallParams, firstByteMs?: number) {
  const level = thinkingLevel(params);
  const adjust = (p: CallParams): CallParams => {
    const rejected = rejectedLevels.get(m.modelId);
    if (!level || !rejected?.has(level)) return p;
    return level === "minimal" && !rejected.has("low") ? withThinkingLevel(p, "low") : withoutThinking(p);
  };
  try {
    return await doStreamWithin(m, adjust(params), firstByteMs);
  } catch (e) {
    const tried = thinkingLevel(adjust(params));
    if (rejectsThinking(e) && tried) {
      rejectedLevels.set(m.modelId, new Set([...(rejectedLevels.get(m.modelId) ?? []), tried]));
      console.warn(`[tutor] ${m.modelId} rejects thinkingLevel=${tried}, retrying with less`);
      return doStreamWithin(m, adjust(params), firstByteMs);
    }
    if (rejectsThinking(e)) {
      console.warn(`[tutor] ${m.modelId} rejects thinkingConfig, retrying without it`);
      return doStreamWithin(m, withoutThinking(params), firstByteMs);
    }
    throw e;
  }
}

/**
 * One model that tries each given model in turn. It moves on only when a model is rate limited
 * or overloaded (429/503: Gemini's free tier limits each model separately), or has sent nothing
 * for `firstByteMs`, before it has sent anything; any other error (bad key, unknown model name,
 * bad request) is thrown as is. Such a model is then skipped for a while (its Retry-After,
 * 10–120 s), unless every model is cooling down, so the next requests do not pay for it again.
 */
export function withModelFallback(models: ProviderModel[], opts: { firstByteMs?: number } = {}): ProviderModel {
  const firstByteMs = opts.firstByteMs ?? FIRST_BYTE_MS;
  const [first] = models;
  if (!first) throw new Error("withModelFallback needs at least one model");
  const middleware: LanguageModelMiddleware = {
    specificationVersion: "v4",
    wrapStream: async ({ params }) => {
      const now = Date.now();
      const ready = models.filter((m) => (cooldownUntil.get(m.modelId) ?? 0) <= now);
      const order = ready.length ? ready : models;
      let last: unknown;
      for (const [i, m] of order.entries()) {
        try {
          const result = await streamOn(m, params, i < order.length - 1 ? firstByteMs : undefined);
          console.info("[tutor] model", m.modelId);
          return result;
        } catch (e) {
          last = e;
          if (e instanceof FirstByteTimeout) {
            coolDown(m.modelId, 60);
            console.warn(`[tutor] ${e.message}, trying the next one`);
            continue;
          }
          const limited = isRateLimited(e);
          if (!limited.limited) throw e;
          coolDown(m.modelId, limited.retryAfter ?? 30);
          console.warn(`[tutor] rate-limited model=${m.modelId}, trying the next one`);
        }
      }
      throw last;
    },
  };
  return wrapLanguageModel({ model: first, middleware }) as ProviderModel;
}

/** The tutor's model for this provider: chat model first, then fallbacks. */
export function tutorModel(p: AiProvider): ProviderModel {
  return withModelFallback(chatModelNames(p, serverEnv().AI_MODEL_CHAT_GOOGLE).map((name) => modelFor(p, name)));
}
