import { APICallError, simulateReadableStream, streamText } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { chatModelNames, withModelFallback, resetTutorCooldown } = await import("@/lib/ai/tutor/model");
const { classifyTutorError, tutorErrorMessage } = await import("@/lib/ai/tutor/errors");
const { AiError } = await import("@/lib/ai/enrich");

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};
const okModel = (text: string, seen?: unknown[]) =>
  new MockLanguageModelV4({
    doStream: async (opts) => {
      seen?.push(opts.providerOptions);
      return {
        stream: simulateReadableStream({
          chunks: [
            { type: "text-start", id: "t" },
            { type: "text-delta", id: "t", delta: text },
            { type: "text-end", id: "t" },
            { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage },
          ],
        }),
      };
    },
  });
const apiError = (statusCode: number, body = "bad") =>
  new APICallError({ message: "boom", url: "x", requestBodyValues: {}, statusCode, responseBody: body });
const failing = (statusCode: number) =>
  new MockLanguageModelV4({
    doStream: async () => {
      throw apiError(statusCode, statusCode === 429 ? '{"error":{"status":"RESOURCE_EXHAUSTED"}}' : "bad");
    },
  });

beforeEach(() => {
  resetTutorCooldown();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** A named model that counts its calls; `fail` decides per call whether it throws. */
function counted(modelId: string, fail: (call: number) => Error | null, seen?: unknown[]) {
  const state = { calls: 0 };
  const model = new MockLanguageModelV4({
    modelId,
    doStream: async (opts) => {
      const e = fail(state.calls++);
      if (e) throw e;
      return okModel(modelId, seen).doStream(opts);
    },
  });
  return { model, state };
}
const ask = (m: unknown, providerOptions?: Record<string, never>) =>
  streamText({ model: m as never, prompt: "hi", maxRetries: 0, providerOptions }).text;

describe("withModelFallback", () => {
  it("moves to the next model on 429", async () => {
    const m = withModelFallback([failing(429), okModel("from-fallback")] as never);
    expect(await streamText({ model: m, prompt: "hi", maxRetries: 0 }).text).toBe("from-fallback");
  });
  it("does not hide a wrong key or model name", async () => {
    const m = withModelFallback([failing(404), okModel("nope")] as never);
    await expect(streamText({ model: m, prompt: "hi", maxRetries: 0, onError: () => {} }).text).rejects.toThrow();
  });
  it("retries without thinkingConfig when the model rejects it", async () => {
    let n = 0;
    const seen: unknown[] = [];
    const picky = new MockLanguageModelV4({
      doStream: async (opts) => {
        if (n++ === 0) throw apiError(400, "thinking_level is not supported");
        return okModel("plain", seen).doStream(opts);
      },
    });
    const m = withModelFallback([picky] as never);
    const r = streamText({
      model: m,
      prompt: "hi",
      maxRetries: 0,
      providerOptions: { google: { thinkingConfig: { thinkingLevel: "low" }, other: 1 } },
    });
    expect(await r.text).toBe("plain");
    expect(seen[0]).toEqual({ google: { other: 1 } });
  });
});

describe("withModelFallback cooldown", () => {
  it("skips a model that just answered 429 and tries it again once the cooldown is over", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const a = counted("a", (n) => (n === 0 ? apiError(429, "RESOURCE_EXHAUSTED") : null));
    const b = counted("b", () => null);
    const m = withModelFallback([a.model, b.model] as never);
    expect(await ask(m)).toBe("b");
    expect(await ask(m)).toBe("b");
    expect(a.state.calls).toBe(1); // second request went straight to b
    vi.setSystemTime(Date.now() + 121_000);
    expect(await ask(m)).toBe("a");
    expect(a.state.calls).toBe(2);
  });

  it("still tries the models in order when all of them are cooling down", async () => {
    const a = counted("a", (n) => (n === 0 ? apiError(429, "RESOURCE_EXHAUSTED") : null));
    const b = counted("b", (n) => (n === 0 ? apiError(503) : null));
    const m = withModelFallback([a.model, b.model] as never);
    await expect(streamText({ model: m, prompt: "hi", maxRetries: 0, onError: () => {} }).text).rejects.toThrow();
    expect(await ask(m)).toBe("a");
  });

  it("moves on from a model that sends nothing, and skips it afterwards", async () => {
    let hung = 0;
    const slow = new MockLanguageModelV4({
      modelId: "slow",
      doStream: ({ abortSignal }) => {
        hung++;
        return new Promise((_, reject) => abortSignal?.addEventListener("abort", () => reject(new Error("aborted"))));
      },
    });
    const b = counted("b", () => null);
    const m = withModelFallback([slow, b.model] as never, { firstByteMs: 30 });
    expect(await ask(m)).toBe("b");
    expect(await ask(m)).toBe("b");
    expect(hung).toBe(1);
  });

  it("uses low for a model that has no minimal thinking, and remembers it", async () => {
    const seen: unknown[] = [];
    const picky = counted("picky", (n) => (n === 0 ? apiError(400, "Thinking level MINIMAL is not supported for this model.") : null), seen);
    const m = withModelFallback([picky.model] as never);
    const opts = { google: { thinkingConfig: { thinkingLevel: "minimal" } } } as never;
    expect(await ask(m, opts)).toBe("picky");
    expect(await ask(m, opts)).toBe("picky");
    expect(picky.state.calls).toBe(3); // one rejected call, then low twice
    expect(seen).toEqual([
      { google: { thinkingConfig: { thinkingLevel: "low" } } },
      { google: { thinkingConfig: { thinkingLevel: "low" } } },
    ]);
  });
});

describe("chatModelNames", () => {
  const p = { provider: "google" as const, apiKey: "k", model: "main", fallbacks: ["fb", "main"] };
  it("puts the chat model first and drops repeats", () => {
    expect(chatModelNames(p, "chat")).toEqual(["chat", "main", "fb"]);
    expect(chatModelNames(p, undefined)).toEqual(["main", "fb"]);
  });
});

describe("classifyTutorError", () => {
  it("sorts errors into actionable kinds", () => {
    expect(classifyTutorError(apiError(429, "RESOURCE_EXHAUSTED")).kind).toBe("rate");
    expect(classifyTutorError(apiError(401)).kind).toBe("config");
    expect(classifyTutorError(apiError(404)).kind).toBe("config");
    expect(classifyTutorError(new AiError("quota_user", "x")).kind).toBe("quota");
    expect(classifyTutorError(new AiError("not_configured", "x")).kind).toBe("no_key");
    expect(classifyTutorError(Object.assign(new Error("x"), { name: "TimeoutError" })).kind).toBe("timeout");
    expect(classifyTutorError(new Error("???")).kind).toBe("unknown");
  });
  it("words each kind in Vietnamese", () => {
    expect(tutorErrorMessage({ kind: "rate", retryAfter: 12.2 })).toContain("13 giây");
    expect(tutorErrorMessage({ kind: "quota" })).toContain("hết lượt");
  });
});
