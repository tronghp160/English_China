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

/** Starts a stream on one model; a model that rejects the thinking settings is asked again without them. */
async function streamOn(m: ProviderModel, params: CallParams) {
  try {
    return await m.doStream(params);
  } catch (e) {
    if (rejectsThinking(e)) {
      console.warn(`[tutor] ${m.modelId} rejects thinkingConfig, retrying without it`);
      return m.doStream(withoutThinking(params));
    }
    throw e;
  }
}

/**
 * One model that tries each given model in turn. It moves on only when a model is rate limited
 * or overloaded (429/503: Gemini's free tier limits each model separately) before it has sent
 * anything; any other error (bad key, unknown model name, bad request) is thrown as is.
 */
export function withModelFallback(models: ProviderModel[]): ProviderModel {
  const [first, ...rest] = models;
  if (!first) throw new Error("withModelFallback needs at least one model");
  const middleware: LanguageModelMiddleware = {
    specificationVersion: "v4",
    wrapStream: async ({ params }) => {
      let last: unknown;
      for (const m of [first, ...rest]) {
        try {
          return await streamOn(m, params);
        } catch (e) {
          last = e;
          if (!isRateLimited(e).limited) throw e;
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
