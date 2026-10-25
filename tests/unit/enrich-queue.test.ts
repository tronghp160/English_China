import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearClientCache, putCached } from "@/lib/ai/client-cache";
import { enqueueEnrich, queueState, resetEnrichQueue, subscribe } from "@/lib/ai/enrich-queue";
import type { EnrichResult } from "@/lib/ai/schemas";

const R = (lemma: string) => ({ language: "en", lemma }) as unknown as EnrichResult;
type Item = { term: string; meaning_vi?: string };

function okBatch() {
  return vi.fn(async (_url: string, init: RequestInit) => {
    const { items } = JSON.parse(String(init.body)) as { items: Item[] };
    return Response.json({ outcomes: items.map((it) => ({ term: it.term, ok: true, result: R(it.term), cached: false })) });
  });
}

function sentTerms(fetchMock: ReturnType<typeof vi.fn>, call: number) {
  const init = fetchMock.mock.calls[call][1] as RequestInit;
  return (JSON.parse(String(init.body)) as { items: Item[] }).items.map((i) => i.term);
}

describe("enrich queue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetEnrichQueue();
    clearClientCache();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("sends 12 words as two batches (10 + 2)", async () => {
    const f = okBatch();
    vi.stubGlobal("fetch", f);
    const all = Array.from({ length: 12 }, (_, i) => enqueueEnrich({ language: "en", term: `w${i}` }));
    await vi.advanceTimersByTimeAsync(2000);
    const results = await Promise.all(all);
    expect(f).toHaveBeenCalledTimes(2);
    expect(sentTerms(f, 0)).toHaveLength(10);
    expect(sentTerms(f, 1)).toEqual(["w10", "w11"]);
    expect(results.every((r) => r.ok)).toBe(true);
  });

  it("waits for typing to pause, sends urgent words almost at once", async () => {
    const f = okBatch();
    vi.stubGlobal("fetch", f);
    void enqueueEnrich({ language: "en", term: "a" });
    await vi.advanceTimersByTimeAsync(1000);
    void enqueueEnrich({ language: "en", term: "b" });
    await vi.advanceTimersByTimeAsync(1000);
    expect(f).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);
    expect(f).toHaveBeenCalledTimes(1);
    expect(sentTerms(f, 0)).toEqual(["a", "b"]);

    void enqueueEnrich({ language: "en", term: "c", urgent: true });
    await vi.advanceTimersByTimeAsync(200);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("asks once for the same word and answers both callers", async () => {
    const f = okBatch();
    vi.stubGlobal("fetch", f);
    const a = enqueueEnrich({ language: "en", term: "Bank" });
    const b = enqueueEnrich({ language: "en", term: "bank " });
    await vi.advanceTimersByTimeAsync(1500);
    expect(sentTerms(f, 0)).toEqual(["Bank"]);
    const [ra, rb] = await Promise.all([a, b]);
    expect(ra).toEqual(rb);
    expect(ra.ok).toBe(true);
  });

  it("answers from the browser cache without a request", async () => {
    const f = okBatch();
    vi.stubGlobal("fetch", f);
    putCached("en", "tough", { result: R("tough"), source: "ai" });
    const r = await enqueueEnrich({ language: "en", term: "Tough" });
    expect(r).toEqual({ ok: true, result: R("tough"), cached: true });
    expect(f).not.toHaveBeenCalled();
  });

  it("caches AI answers so the next ask is free", async () => {
    const f = okBatch();
    vi.stubGlobal("fetch", f);
    const p = enqueueEnrich({ language: "en", term: "calm" });
    await vi.advanceTimersByTimeAsync(1500);
    await p;
    await enqueueEnrich({ language: "en", term: "calm" });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("resends after a busy answer and gives up after 3 retries", async () => {
    const f = vi.fn(async () => Response.json({ error: "AI đang bận", code: "busy", retryAfter: 5 }, { status: 503 }));
    vi.stubGlobal("fetch", f);
    const states: (number | null)[] = [];
    subscribe((s) => states.push(s.busyUntil));
    let settled: unknown = null;
    void enqueueEnrich({ language: "en", term: "x", urgent: true }).then((r) => (settled = r));
    await vi.advanceTimersByTimeAsync(200);
    expect(f).toHaveBeenCalledTimes(1);
    expect(queueState().busyUntil).not.toBeNull();
    await vi.advanceTimersByTimeAsync(4900);
    expect(f).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(200);
    expect(f).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(10_500);
    expect(f).toHaveBeenCalledTimes(4);
    expect(settled).toEqual({ ok: false, error: "AI đang bận", code: "busy", retryAfter: 5 });
    expect(states.some((s) => s !== null)).toBe(true);
  });

  it("applies a later success after a busy answer", async () => {
    let n = 0;
    const f = vi.fn(async (_u: string, init: RequestInit) => {
      if (n++ === 0) return Response.json({ code: "busy", retryAfter: 2 }, { status: 503 });
      return okBatch()(_u, init);
    });
    vi.stubGlobal("fetch", f);
    const p = enqueueEnrich({ language: "en", term: "y", urgent: true });
    await vi.advanceTimersByTimeAsync(2500);
    expect(await p).toMatchObject({ ok: true, result: R("y") });
  });

  it("stops asking once the quota is gone", async () => {
    const f = vi.fn(async () => Response.json({ error: "Hết lượt", code: "quota_user" }, { status: 429 }));
    vi.stubGlobal("fetch", f);
    const first = enqueueEnrich({ language: "en", term: "a", urgent: true });
    await vi.advanceTimersByTimeAsync(200);
    expect(await first).toEqual({ ok: false, error: "Hết lượt", code: "quota_user" });
    const later = await enqueueEnrich({ language: "en", term: "b", urgent: true });
    expect(later).toEqual({ ok: false, error: "Hết lượt", code: "quota_user" });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("leaves aborted words out of the batch", async () => {
    const f = okBatch();
    vi.stubGlobal("fetch", f);
    const ctrl = new AbortController();
    const gone = enqueueEnrich({ language: "en", term: "gone", signal: ctrl.signal });
    void enqueueEnrich({ language: "en", term: "kept" });
    ctrl.abort();
    expect(await gone).toMatchObject({ ok: false, code: "aborted" });
    await vi.advanceTimersByTimeAsync(1500);
    expect(sentTerms(f, 0)).toEqual(["kept"]);
  });

  it("fails the batch on a network error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    const p = enqueueEnrich({ language: "zh", term: "坚强", urgent: true });
    await vi.advanceTimersByTimeAsync(200);
    expect(await p).toMatchObject({ ok: false, code: "failed" });
  });
});
