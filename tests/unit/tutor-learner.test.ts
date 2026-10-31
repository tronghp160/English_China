import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { learnerSnapshot } = await import("@/lib/ai/tutor/learner");

type Overview = { language: "en" | "zh"; total_cards: number; due_count: number; reviews_left: number | null };
type Args = { p_language: string; p_source: string; p_limit: number };

const row = (term: string, lapses: number) => ({ word: { term, reading: null, meaning_vi: `nghĩa ${term}` }, lapses });

/** A fake RLS client: today_overview resolves only when `release` is called; every call is logged in order. */
function fakeSupabase(overview: Overview[]) {
  const log: string[] = [];
  let release = () => {};
  const gate = new Promise<void>((r) => (release = r));
  const supabase = {
    rpc: async (name: string, args?: Args) => {
      if (name === "today_overview") {
        log.push("overview:start");
        await gate;
        log.push("overview:done");
        return { data: overview, error: null };
      }
      log.push(`words:${args!.p_language}:${args!.p_source}`);
      const words = args!.p_source === "hard" ? [row(`${args!.p_language}-hard`, 2), row(`${args!.p_language}-easy`, 0)] : [row(`${args!.p_language}-new`, 0)];
      return { data: words, error: null };
    },
  };
  return { supabase: supabase as never, log, release: () => release() };
}

describe("learnerSnapshot", () => {
  it("asks for the word lists before the overview has answered", async () => {
    const f = fakeSupabase([{ language: "en", total_cards: 5, due_count: 3, reviews_left: null }]);
    const result = learnerSnapshot(f.supabase, ["en", "zh"]);
    await new Promise((r) => setTimeout(r, 0));
    expect(f.log).toEqual(["overview:start", "words:en:hard", "words:en:recent", "words:zh:hard", "words:zh:recent"]);
    f.release();
    await result;
    expect(f.log.at(-1)).toBe("overview:done");
  });

  it("gives the same result as before", async () => {
    const f = fakeSupabase([
      { language: "en", total_cards: 5, due_count: 30, reviews_left: 12 },
      { language: "zh", total_cards: 0, due_count: 0, reviews_left: null },
    ]);
    f.release();
    expect(await learnerSnapshot(f.supabase, ["en", "zh"])).toEqual([
      {
        language: "en",
        total: 5,
        due: 12,
        hard: [{ term: "en-hard", reading: null, meaning_vi: "nghĩa en-hard", lapses: 2 }],
        recent: [{ term: "en-new", reading: null, meaning_vi: "nghĩa en-new", lapses: 0 }],
      },
      { language: "zh", total: 0, due: 0, hard: [], recent: [] }, // no cards: lists left out
    ]);
  });

  it("loads a language that is only in the overview in a second round", async () => {
    const f = fakeSupabase([{ language: "zh", total_cards: 2, due_count: 1, reviews_left: null }]);
    f.release();
    const result = await learnerSnapshot(f.supabase, ["en"]);
    expect(result.map((s) => s.language)).toEqual(["en", "zh"]);
    expect(result[1].recent[0].term).toBe("zh-new");
    expect(f.log.indexOf("words:zh:hard")).toBeGreaterThan(f.log.indexOf("overview:done"));
  });

  it("returns nothing when a read fails", async () => {
    const supabase = { rpc: async () => Promise.reject(new Error("down")) } as never;
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await learnerSnapshot(supabase, ["en"])).toEqual([]);
  });
});
