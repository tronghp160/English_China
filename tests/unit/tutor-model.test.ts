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

describe("withModelFallback hedge", () => {
  /** Answers `text` after `ms`, or fails with `error` after `ms`; records whether its request was aborted. */
  function after(modelId: string, ms: number, outcome: { text?: string; error?: Error } = { text: modelId }) {
    const state = { calls: 0, aborted: false };
    const model = new MockLanguageModelV4({
      modelId,
      doStream: (opts) => {
        state.calls++;
        return new Promise((resolve, reject) => {
          const t = setTimeout(() => (outcome.error ? reject(outcome.error) : resolve(okModel(outcome.text ?? modelId).doStream(opts))), ms);
          opts.abortSignal?.addEventListener("abort", () => {
            state.aborted = true;
            clearTimeout(t);
            reject(new Error("aborted"));
          });
        });
      },
    });
    return { model, state };
  }
  const hedged = (models: unknown[], hedgeMs = 20, onHedge?: (i: { model: string; won: boolean }) => void) =>
    withModelFallback(models as never, { hedgeMs, onHedge });

  it("starts the next model when the first is slow, uses the one that answers first and aborts the other", async () => {
    const a = after("a", 300);
    const b = after("b", 10);
    const seen: { model: string; won: boolean }[] = [];
    const m = hedged([a.model, b.model], 20, (i) => seen.push(i));
    expect(await ask(m)).toBe("b");
    expect(a.state.aborted).toBe(true);
    expect(seen).toEqual([{ model: "b", won: true }]);
  });

  it("does not put the model that lost on cooldown", async () => {
    const a = after("a", 300);
    const b = after("b", 10);
    const m = hedged([a.model, b.model]);
    await ask(m);
    await ask(m);
    expect(a.state.calls).toBe(2); // the second request tried a first again
  });

  it("does not hedge when the first model answers in time", async () => {
    const a = after("a", 5);
    const b = after("b", 5);
    const seen: unknown[] = [];
    const m = hedged([a.model, b.model], 100, (i) => seen.push(i));
    expect(await ask(m)).toBe("a");
    expect(b.state.calls).toBe(0);
    expect(seen).toEqual([]);
  });

  it("keeps the first model if it answers after the hedge started but before the hedge does", async () => {
    const a = after("a", 60);
    const b = after("b", 400);
    const seen: { model: string; won: boolean }[] = [];
    const m = hedged([a.model, b.model], 20, (i) => seen.push(i));
    expect(await ask(m)).toBe("a");
    expect(b.state.aborted).toBe(true);
    expect(seen).toEqual([{ model: "b", won: false }]); // a hedge was started (it cost a request) but lost
  });

  it("with hedgeMs 0 behaves as before: waits for the first model", async () => {
    const a = after("a", 80);
    const b = after("b", 1);
    const m = hedged([a.model, b.model], 0);
    expect(await ask(m)).toBe("a");
    expect(b.state.calls).toBe(0);
  });

  it("throws the last error when both models fail", async () => {
    const a = after("a", 60, { error: apiError(429, "RESOURCE_EXHAUSTED") });
    const b = after("b", 5, { error: apiError(503) });
    const m = hedged([a.model, b.model]);
    await expect(streamText({ model: m as never, prompt: "hi", maxRetries: 0, onError: () => {} }).text).rejects.toThrow();
    expect(a.state.calls).toBe(1);
    expect(b.state.calls).toBe(1);
  });

  it("still throws a wrong key or model name from the first model, and drops the hedge", async () => {
    const a = after("a", 60, { error: apiError(404) });
    const b = after("b", 400);
    const m = hedged([a.model, b.model]);
    await expect(streamText({ model: m as never, prompt: "hi", maxRetries: 0, onError: () => {} }).text).rejects.toThrow();
    expect(b.state.aborted).toBe(true);
  });

  it("ignores a hedge that fails for another reason while the first model still works", async () => {
    const a = after("a", 80);
    const b = after("b", 5, { error: apiError(404) });
    const m = hedged([a.model, b.model]);
    expect(await ask(m)).toBe("a");
  });

  it("moves on to a third model after the first two were rate limited", async () => {
    const a = after("a", 50, { error: apiError(429, "RESOURCE_EXHAUSTED") });
    const b = after("b", 5, { error: apiError(503) });
    const c = after("c", 5);
    const m = hedged([a.model, b.model, c.model]);
    expect(await ask(m)).toBe("c");
  });

  it("stops the models when the request itself is aborted", async () => {
    const a = after("a", 500);
    const b = after("b", 500);
    const ctrl = new AbortController();
    const m = hedged([a.model, b.model]);
    const r = streamText({ model: m as never, prompt: "hi", maxRetries: 0, abortSignal: ctrl.signal, onError: () => {} });
    setTimeout(() => ctrl.abort(), 60);
    await Promise.resolve(r.text).catch(() => {});
    expect(a.state.aborted).toBe(true);
    expect(b.state.aborted).toBe(true);
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
