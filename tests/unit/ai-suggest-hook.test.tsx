// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAiSuggest } from "@/components/word/ai-suggest";
import { clearClientCache } from "@/lib/ai/client-cache";
import { resetEnrichQueue } from "@/lib/ai/enrich-queue";

vi.mock("@/components/app-shell/me-provider", () => ({ useOptionalMe: () => null }));

const entry = (meaning: string) => ({
  language: "en",
  is_valid_word: true,
  did_you_mean: null,
  lemma: "resilient",
  ipa_us: "/rɪˈzɪliənt/",
  ipa_uk: null,
  cefr: null,
  senses: [{ pos: ["adj"], meaning_vi: meaning, meaning_en: "Able to recover.", examples: [], image_query: "tree" }],
  synonyms: [],
  antonyms: [],
  collocations: [],
  word_family: [],
  verb_forms: null,
  plural: null,
  topic_vi: null,
  emoji: "",
  image_query: "tree",
  memory_tip_vi: null,
  checks: {},
});

function mockFetch() {
  return vi.fn(async (url: string, init: RequestInit) => {
    if (url === "/api/lookup") return Response.json({ result: entry("kiên cường (từ điển)"), source: "dict" });
    if (url === "/api/ai/enrich-batch") {
      const { items } = JSON.parse(String(init.body)) as { items: { term: string }[] };
      return Response.json({ outcomes: items.map((it) => ({ term: it.term, ok: true, result: entry("kiên cường"), cached: false })) });
    }
    return Response.json({ error: "?" }, { status: 404 });
  });
}

const urls = (f: ReturnType<typeof vi.fn>) => f.mock.calls.map((c) => c[0]);

describe("useAiSuggest", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetEnrichQueue();
    clearClientCache();
    sessionStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("fills from the dictionary, then the AI batch; the same word again costs nothing", async () => {
    const f = mockFetch();
    vi.stubGlobal("fetch", f);
    const onApply = vi.fn();
    const { result, rerender } = renderHook(({ term }) => useAiSuggest({ language: "en", term, getTerm: () => term, onApply }), {
      initialProps: { term: "" },
    });

    rerender({ term: "resilient" });
    await act(() => vi.advanceTimersByTimeAsync(950));
    expect(urls(f)).toEqual(["/api/lookup"]);
    expect(result.current.state).toMatchObject({ status: "done", source: "dict", aiPending: true });
    expect(onApply).toHaveBeenLastCalledWith(expect.objectContaining({ values: expect.objectContaining({ meaning_vi: "kiên cường (từ điển)" }) }));

    await act(() => vi.advanceTimersByTimeAsync(1300));
    expect(urls(f)).toEqual(["/api/lookup", "/api/ai/enrich-batch"]);
    expect(result.current.state).toMatchObject({ status: "done", source: "ai", aiPending: false });
    expect(onApply).toHaveBeenLastCalledWith(expect.objectContaining({ values: expect.objectContaining({ meaning_vi: "kiên cường" }) }));

    // Clear the field, type the word again: answered from the tab's memory.
    rerender({ term: "" });
    act(() => result.current.reset());
    rerender({ term: "resilient" });
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(f).toHaveBeenCalledTimes(2);
    expect(result.current.state).toMatchObject({ status: "done", source: "ai", cached: true });
  });
});
