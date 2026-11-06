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

type StreamResult = Awaited<ReturnType<ProviderModel["doStream"]>>;

/** One try on one model of the order; `hedge` marks the one started early because the first was slow. */
type Attempt = {
  i: number;
  model: ProviderModel;
  ctrl: AbortController;
  hedge: boolean;
  done: Promise<{ attempt: Attempt; ok: true; result: StreamResult } | { attempt: Attempt; ok: false; error: unknown }>;
};

/** Gives up an attempt that lost the race: aborts its request and closes its stream if it had already answered. */
function discard(a: Attempt) {
  a.ctrl.abort();
  void a.done.then((r) => {
    if (r.ok) void r.result.stream.cancel().catch(() => {});
  });
}

export type HedgeInfo = { model: string; won: boolean };

/**
 * Tries the models of `order` for one request and returns the first stream that starts.
 * - A model that is rate limited or overloaded (429/503) or sends nothing for `firstByteMs` is given up,
 *   put on cooldown, and the next one is tried; any other error (bad key, unknown model name, bad request)
 *   is thrown as is.
 * - Hedge: when `hedgeMs` > 0 and the first model has not answered (headers) after that long, the next model
 *   is started at the same time and whichever answers first is used; the other is aborted. The loser is not
 *   put on cooldown (only its own 429/503 would). Only one hedge per request, so the extra cost is bounded.
 *   A hedge that fails for another reason is ignored while the earlier model is still working.
 */
async function raceModels(
  order: ProviderModel[],
  params: CallParams,
  opts: { firstByteMs: number; hedgeMs: number; onHedge?: (info: HedgeInfo) => void },
): Promise<StreamResult> {
  const inflight: Attempt[] = [];
  let next = 0;
  let last: unknown;
  let hedgeStarted: Attempt | undefined;
  let winner: Attempt | undefined;
  const outer = params.abortSignal;

  const launch = (hedge: boolean) => {
    const i = next++;
    const model = order[i];
    const ctrl = new AbortController();
    const forward = () => ctrl.abort(outer?.reason);
    if (outer?.aborted) forward();
    else outer?.addEventListener("abort", forward, { once: true });
    const attempt = { i, model, ctrl, hedge } as Attempt;
    attempt.done = streamOn(model, { ...params, abortSignal: ctrl.signal }, i < order.length - 1 ? opts.firstByteMs : undefined).then(
      (result) => ({ attempt, ok: true as const, result }),
      (error: unknown) => ({ attempt, ok: false as const, error }),
    );
    inflight.push(attempt);
    if (hedge) hedgeStarted = attempt;
  };

  try {
    launch(false);
    for (;;) {
      let hedgeTimer: ReturnType<typeof setTimeout> | undefined;
      const waiting: Promise<Awaited<Attempt["done"]> | "hedge">[] = inflight.map((a) => a.done);
      if (opts.hedgeMs > 0 && !hedgeStarted && inflight.length === 1 && next < order.length) {
        waiting.push(new Promise<"hedge">((resolve) => (hedgeTimer = setTimeout(() => resolve("hedge"), opts.hedgeMs))));
      }
      const event = await Promise.race(waiting);
      clearTimeout(hedgeTimer);
      if (event === "hedge") {
        launch(true);
        continue;
      }

      inflight.splice(inflight.indexOf(event.attempt), 1);
      if (event.ok) {
        winner = event.attempt;
        for (const loser of inflight) discard(loser);
        console.info("[tutor] model", event.attempt.model.modelId);
        if (event.attempt.hedge) console.info(`[tutor] hedge won=${event.attempt.model.modelId}`);
        return event.result;
      }

      const { attempt, error: e } = event;
      last = e;
      if (e instanceof FirstByteTimeout) {
        coolDown(attempt.model.modelId, 60);
        console.warn(`[tutor] ${e.message}, trying the next one`);
      } else {
        const limited = isRateLimited(e);
        if (!limited.limited) {
          if (inflight.some((o) => o.i < attempt.i)) continue; // a hedge failed: wait for the earlier model
          for (const other of inflight) discard(other);
          throw e;
        }
        coolDown(attempt.model.modelId, limited.retryAfter ?? 30);
        console.warn(`[tutor] rate-limited model=${attempt.model.modelId}, trying the next one`);
      }
      if (!inflight.length) {
        if (next >= order.length) throw last;
        launch(false);
      }
    }
  } finally {
    const started = hedgeStarted as Attempt | undefined; // assigned inside launch(), which TypeScript cannot see through
    if (started) opts.onHedge?.({ model: started.model.modelId, won: winner === started });
  }
}

/**
 * One model that tries each given model in turn, with an early second try when the first is slow
 * (see raceModels). A model that was rate limited, overloaded or silent is then skipped for a while
 * (its Retry-After, 10–120 s), unless every model is cooling down, so the next requests do not pay for it again.
 * `hedgeMs` 0 (the default here) turns the early second try off; the tutor passes AI_HEDGE_MS.
 */
export function withModelFallback(
  models: ProviderModel[],
  opts: { firstByteMs?: number; hedgeMs?: number; onHedge?: (info: HedgeInfo) => void } = {},
): ProviderModel {
  const firstByteMs = opts.firstByteMs ?? FIRST_BYTE_MS;
  const hedgeMs = opts.hedgeMs ?? 0;
  const [first] = models;
  if (!first) throw new Error("withModelFallback needs at least one model");
  const middleware: LanguageModelMiddleware = {
    specificationVersion: "v4",
    wrapStream: async ({ params }) => {
      const now = Date.now();
      const ready = models.filter((m) => (cooldownUntil.get(m.modelId) ?? 0) <= now);
      return raceModels(ready.length ? ready : models, params, { firstByteMs, hedgeMs, onHedge: opts.onHedge });
    },
  };
  return wrapLanguageModel({ model: first, middleware }) as ProviderModel;
}

/** The tutor's model for this provider: chat model first, then fallbacks; `onHedge` hears when a second model was started early. */
export function tutorModel(p: AiProvider, opts: { onHedge?: (info: HedgeInfo) => void } = {}): ProviderModel {
  const env = serverEnv();
  return withModelFallback(
    chatModelNames(p, env.AI_MODEL_CHAT_GOOGLE).map((name) => modelFor(p, name)),
    { hedgeMs: env.AI_HEDGE_MS, onHedge: opts.onHedge },
  );
}
