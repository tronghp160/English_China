import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { insertThread } = await import("@/lib/ai/tutor/threads");

/** Records the query builder calls of one chat_threads write. */
function fakeSupabase() {
  const calls: unknown[][] = [];
  const builder = {
    insert: (...a: unknown[]) => (calls.push(["insert", ...a]), builder),
    upsert: (...a: unknown[]) => (calls.push(["upsert", ...a]), Promise.resolve({ error: null })),
    select: (...a: unknown[]) => (calls.push(["select", ...a]), builder),
    single: () => Promise.resolve({ data: { id: "new" }, error: null }),
  };
  return { supabase: { from: (t: string) => (calls.push(["from", t]), builder) } as never, calls };
}

describe("insertThread", () => {
  it("inserts and returns the new id when the server picks it", async () => {
    const f = fakeSupabase();
    const res = await insertThread(f.supabase, { userId: "u", language: "zh", title: "坚强" });
    expect(res.data).toEqual({ id: "new" });
    expect(f.calls[1]).toEqual(["insert", { user_id: "u", language: "zh", deck_id: null, title: "坚强" }]);
  });

  it("upserts a client id and ignores a repeat (a retried first question)", async () => {
    const f = fakeSupabase();
    await insertThread(f.supabase, { id: "t1", userId: "u", language: "en", deckId: "d", title: "hi" });
    expect(f.calls[1]).toEqual([
      "upsert",
      { id: "t1", user_id: "u", language: "en", deck_id: "d", title: "hi" },
      { onConflict: "id", ignoreDuplicates: true },
    ]);
  });
});
