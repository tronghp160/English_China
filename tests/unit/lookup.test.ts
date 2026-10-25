import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EnrichResult } from "@/lib/ai/schemas";

const readCachedEnrich = vi.fn();
const lookupFree = vi.fn();
vi.mock("@/lib/ai/enrich", () => ({ readCachedEnrich: (...a: unknown[]) => readCachedEnrich(...a) }));
vi.mock("@/lib/dict", () => ({ lookupFree: (...a: unknown[]) => lookupFree(...a) }));

const { lookupBest } = await import("@/lib/ai/lookup");

const AI = { language: "en", lemma: "ai" } as unknown as EnrichResult;
const DICT = { language: "en", lemma: "dict" } as unknown as EnrichResult;

describe("lookupBest", () => {
  beforeEach(() => {
    readCachedEnrich.mockReset();
    lookupFree.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("prefers the shared AI cache", async () => {
    readCachedEnrich.mockResolvedValue(AI);
    lookupFree.mockResolvedValue(DICT);
    expect(await lookupBest("en", "Resilient")).toEqual({ result: AI, source: "cache" });
    expect(readCachedEnrich).toHaveBeenCalledWith("en", "resilient");
  });

  it("falls back to the free dictionary", async () => {
    readCachedEnrich.mockResolvedValue(null);
    lookupFree.mockResolvedValue(DICT);
    expect(await lookupBest("en", "bank")).toEqual({ result: DICT, source: "dict" });
  });

  it("returns nothing when neither knows the word", async () => {
    readCachedEnrich.mockResolvedValue(null);
    lookupFree.mockResolvedValue(null);
    expect(await lookupBest("en", "zzzz")).toEqual({ result: null, source: null });
  });

  it("survives a dictionary error", async () => {
    readCachedEnrich.mockResolvedValue(AI);
    lookupFree.mockRejectedValue(new Error("down"));
    expect(await lookupBest("en", "x")).toEqual({ result: AI, source: "cache" });
    readCachedEnrich.mockResolvedValue(null);
    expect(await lookupBest("en", "x")).toEqual({ result: null, source: null });
  });

  it("survives a cache error", async () => {
    readCachedEnrich.mockRejectedValue(new Error("db"));
    lookupFree.mockResolvedValue(DICT);
    expect(await lookupBest("en", "x")).toEqual({ result: DICT, source: "dict" });
  });
});
