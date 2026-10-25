import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cacheKey, clearClientCache, CLIENT_CACHE_KEY, getCached, putCached } from "@/lib/ai/client-cache";
import type { EnrichResult } from "@/lib/ai/schemas";

const R = (lemma: string) => ({ language: "en", lemma }) as unknown as EnrichResult;

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

describe("client lookup cache", () => {
  beforeEach(() => clearClientCache());
  afterEach(() => vi.unstubAllGlobals());

  it("normalizes English case and spaces, keeps Chinese as typed", () => {
    expect(cacheKey("en", "Resilient ")).toBe(cacheKey("en", "resilient"));
    expect(cacheKey("en", " give  up")).toBe("en:give up");
    expect(cacheKey("zh", " 坚强 ")).toBe("zh:坚强");
  });

  it("never replaces an AI answer with a dictionary answer", () => {
    putCached("en", "bank", { result: R("ai"), source: "ai" });
    putCached("en", "Bank", { result: R("dict"), source: "dict" });
    expect(getCached("en", "bank")?.result).toEqual(R("ai"));
    putCached("en", "bank", { result: R("ai2"), source: "cache" });
    expect(getCached("en", "bank")?.source).toBe("cache");
  });

  it("drops the oldest entry past 300", () => {
    for (let i = 0; i < 301; i++) putCached("en", `w${i}`, { result: R(`w${i}`), source: "dict", at: 1000 + i });
    expect(getCached("en", "w0")).toBeNull();
    expect(getCached("en", "w1")).not.toBeNull();
    expect(getCached("en", "w300")).not.toBeNull();
  });

  it("mirrors to sessionStorage and reads it back", () => {
    const s = fakeStorage();
    vi.stubGlobal("sessionStorage", s);
    putCached("zh", "坚强", { result: R("jq"), source: "ai" });
    expect(s.data.get(CLIENT_CACHE_KEY)).toContain("坚强");
    clearClientCache();
    expect(getCached("zh", "坚强")?.result).toEqual(R("jq"));
  });

  it("keeps working when sessionStorage throws", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
    });
    putCached("en", "tough", { result: R("tough"), source: "dict" });
    expect(getCached("en", "tough")?.result).toEqual(R("tough"));
  });
});
