import { APICallError, NoObjectGeneratedError } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const generateText = vi.fn();
vi.mock("ai", async (orig) => ({ ...(await orig<typeof import("ai")>()), generateText: (...a: unknown[]) => generateText(...a) }));

const provider = { provider: "google" as const, apiKey: "k", model: "main", fallbacks: ["spare"] };
vi.mock("@/lib/env", async (orig) => ({
  ...(await orig<typeof import("@/lib/env")>()),
  aiProvider: () => provider,
}));

const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc }) }));

const { AiError, callModel, isRateLimited, secondsToNextMinute } = await import("@/lib/ai/enrich");
const { hitGlobalLimit } = await import("@/lib/rate-limit");
const { modelList } = await import("@/lib/env");

const schema = z.object({ ok: z.boolean() });
const usage = { inputTokens: 1, outputTokens: 1 };

function apiError(statusCode: number, extra: Partial<{ responseBody: string; responseHeaders: Record<string, string> }> = {}) {
  return new APICallError({ message: "x", url: "u", requestBodyValues: {}, statusCode, ...extra });
}

function noObject() {
  return new NoObjectGeneratedError({
    response: { id: "r", timestamp: new Date(), modelId: "m" },
    usage: usage as never,
    finishReason: "stop",
  });
}

const modelIdOf = (call: number) => (generateText.mock.calls[call][0] as { model: { modelId: string } }).model.modelId;

describe("callModel fallbacks", () => {
  beforeEach(() => {
    generateText.mockReset();
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("moves to the fallback model after a 429", async () => {
    generateText.mockRejectedValueOnce(apiError(429)).mockResolvedValueOnce({ output: { ok: true }, usage });
    const r = await callModel(schema, "s", "p", 100);
    expect(r).toEqual({ output: { ok: true }, model: "spare" });
    expect(generateText).toHaveBeenCalledTimes(2);
    expect(modelIdOf(0)).toBe("main");
    expect(modelIdOf(1)).toBe("spare");
    expect((generateText.mock.calls[0][0] as { maxRetries: number }).maxRetries).toBe(0);
  });

  it("is busy when every model is rate limited", async () => {
    generateText
      .mockRejectedValueOnce(apiError(429, { responseBody: '{"retryDelay": "17s"}' }))
      .mockRejectedValueOnce(apiError(503, { responseHeaders: { "retry-after": "40" } }));
    const err = await callModel(schema, "s", "p", 100).catch((e) => e);
    expect(err).toBeInstanceOf(AiError);
    expect(err.code).toBe("busy");
    expect(err.retryAfter).toBe(17);
  });

  it("retries the same model once when the output fails the schema", async () => {
    generateText.mockRejectedValueOnce(noObject()).mockResolvedValueOnce({ output: { ok: true }, usage });
    const r = await callModel(schema, "s", "p", 100);
    expect(r.model).toBe("main");
    expect(generateText).toHaveBeenCalledTimes(2);
  });

  it("calls again without thinkingConfig when the model rejects it", async () => {
    generateText
      .mockRejectedValueOnce(apiError(400, { responseBody: "thinking_level is not supported by this model" }))
      .mockResolvedValueOnce({ output: { ok: true }, usage });
    const r = await callModel(schema, "s", "p", 100);
    expect(r.model).toBe("main");
    const opts = (call: number) => (generateText.mock.calls[call][0] as { providerOptions: Record<string, unknown> }).providerOptions;
    expect(opts(0).google).toEqual({ thinkingConfig: { thinkingLevel: "minimal" } });
    expect(opts(1).google).toBeUndefined();
  });

  it("fails at once on other errors", async () => {
    generateText.mockRejectedValueOnce(apiError(400));
    const err = await callModel(schema, "s", "p", 100).catch((e) => e);
    expect(err.code).toBe("failed");
    expect(generateText).toHaveBeenCalledTimes(1);
  });
});

describe("isRateLimited", () => {
  it("reads status codes, Google's retryDelay and wrapped errors", () => {
    expect(isRateLimited(apiError(429))).toEqual({ limited: true, retryAfter: 20 });
    expect(isRateLimited(apiError(429, { responseBody: '"retryDelay": "6.5s"' })).retryAfter).toBe(7);
    expect(isRateLimited(apiError(500, { responseBody: "RESOURCE_EXHAUSTED" })).limited).toBe(true);
    expect(isRateLimited(apiError(400)).limited).toBe(false);
    expect(isRateLimited({ lastError: apiError(429) }).limited).toBe(true);
    expect(isRateLimited(new Error("boom")).limited).toBe(false);
    expect(isRateLimited(null).limited).toBe(false);
  });

  it("counts seconds to the next minute", () => {
    expect(secondsToNextMinute(60_000 * 5 + 15_000)).toBe(45);
    expect(secondsToNextMinute(60_000 * 5)).toBe(60);
  });
});

describe("modelList", () => {
  it("splits a comma list and keeps a single model", () => {
    expect(modelList("a, b ,,c")).toEqual(["a", "b", "c"]);
    expect(modelList("gemini-x")).toEqual(["gemini-x"]);
  });
});

describe("hitGlobalLimit", () => {
  it("fails open when the RPC errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValueOnce({ data: null, error: { message: "down" } });
    expect(await hitGlobalLimit("ai_rpm", 10, 60)).toBe(true);
    rpc.mockResolvedValueOnce({ data: false, error: null });
    expect(await hitGlobalLimit("ai_rpm", 10, 60)).toBe(false);
    expect(rpc).toHaveBeenLastCalledWith("hit_ip_rate_limit", expect.objectContaining({ p_key_hash: "global" }));
  });
});
