import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Every read the prelude starts is logged when it STARTS; each one stays pending until `release` is called,
// so the log shows whether any read waited for another one.
const log: string[] = [];
let release: () => void = () => {};
let gateOpen: Promise<void> = Promise.resolve();
const pending = <T>(name: string, value: T) => {
  log.push(name);
  return gateOpen.then(() => value);
};

const loadMe = vi.fn((user: { id: string }) => pending("me", { user, profile: {}, settings: { study_langs: ["en"] } }));
vi.mock("@/lib/auth", () => ({ loadMe: (u: { id: string }) => loadMe(u) }));
const aiGate = vi.fn((): Promise<{ allowed: boolean }> => pending("gate", { allowed: true }));
vi.mock("@/lib/ai/gate", () => ({ aiGate: () => aiGate() }));
const learnerSnapshot = vi.fn((_s: unknown, langs: string[]) => pending(`snapshot:${langs.join("+")}`, [{ language: "en", total: 1, due: 0, hard: [], recent: [] }]));
vi.mock("@/lib/ai/tutor/learner", () => ({ learnerSnapshot: (s: unknown, l: string[]) => learnerSnapshot(s, l) }));
vi.mock("@/lib/ai/tutor/page-context", () => ({ pageContextLine: (_s: unknown, path: string) => pending(`page:${path}`, "context line") }));

/** A chainable fake of the supabase query builder: any chain ends in a promise that logs `from(table)`. */
function fakeSupabase() {
  const from = (table: string) => {
    const result = pending(`db:${table}`, { data: table === "chat_messages" ? [] : null, error: null });
    const chain: Record<string, unknown> = new Proxy(
      {},
      { get: (_t, prop) => (prop === "then" ? result.then.bind(result) : () => chain) },
    );
    return chain;
  };
  return { from } as never;
}

const { startPrelude } = await import("@/lib/ai/tutor/prelude");
const { createSnapshotCache } = await import("@/lib/ai/tutor/snapshot-cache");

const user = { id: "u1", email: null };
const timer = { marks: [] as string[], mark(n: string) { this.marks.push(n); }, header: () => "", log: () => {} };
const base = () => ({ supabase: fakeSupabase(), user, threadId: "t1", timer, cache: createSnapshotCache() });

beforeEach(() => {
  log.length = 0;
  timer.marks.length = 0;
  loadMe.mockClear();
  learnerSnapshot.mockClear();
  aiGate.mockClear();
  gateOpen = new Promise<void>((r) => (release = r));
});

const settle = async (p: ReturnType<typeof startPrelude>) => {
  release();
  return Promise.all([p.me, p.gate, p.deck, p.context]);
};

describe("startPrelude", () => {
  it("starts every read before any of them has answered", async () => {
    const p = startPrelude({ ...base(), contextPath: "/decks/abc" });
    // nothing is released yet: all reads must already have started
    expect(log).toEqual(
      expect.arrayContaining(["me", "db:chat_threads", "gate", "db:chat_messages", "snapshot:en+zh", "page:/decks/abc"]),
    );
    expect(log).toHaveLength(6); // one request for both limits
    await settle(p);
  });

  it("asks for the snapshot of both languages without the learner's settings", async () => {
    const p = startPrelude(base());
    expect(learnerSnapshot).toHaveBeenCalledWith(expect.anything(), ["en", "zh"]);
    await settle(p);
  });

  it("reads the deck of a new conversation in the same round, and no deck otherwise", async () => {
    const withDeck = startPrelude({ ...base(), newThread: { deckId: "d1" } });
    expect(log).toContain("db:decks");
    await settle(withDeck);
    log.length = 0;
    gateOpen = new Promise<void>((r) => (release = r));
    const without = startPrelude({ ...base(), newThread: {} });
    expect(log).not.toContain("db:decks");
    await settle(without);
  });

  it("returns the quota failure as a value instead of throwing", async () => {
    aiGate.mockImplementationOnce(() => pending("gate", 0).then(() => Promise.reject(new Error("quota_user"))));
    const p = startPrelude(base());
    const [, [, allowed, quotaError]] = await settle(p);
    expect(allowed).toBe(true); // a quota error is not a rate limit
    expect((quotaError as Error).message).toBe("quota_user");
  });

  it("marks auth, limits and context as each part finishes", async () => {
    const p = startPrelude(base());
    await settle(p);
    expect(timer.marks).toEqual(expect.arrayContaining(["auth", "limits", "context"]));
  });

  it("reuses a cached snapshot for a follow-up, but not for the first message", async () => {
    const cache = createSnapshotCache();
    cache.set("u1", [{ language: "en", total: 9, due: 0, hard: [], recent: [] }]);

    const followUp = startPrelude({ ...base(), cache });
    expect(followUp.usedCachedSnapshot).toBe(true);
    expect(learnerSnapshot).not.toHaveBeenCalled();
    const [, , , [, snapshot]] = await settle(followUp);
    expect(snapshot[0].total).toBe(9);

    gateOpen = new Promise<void>((r) => (release = r));
    const first = startPrelude({ ...base(), cache, newThread: {} });
    expect(first.usedCachedSnapshot).toBe(false);
    expect(learnerSnapshot).toHaveBeenCalledTimes(1);
    await settle(first);
  });

  it("stores a fresh snapshot, but not an empty one (a failed read)", async () => {
    const cache = createSnapshotCache();
    const p = startPrelude({ ...base(), cache });
    await settle(p);
    expect(cache.get("u1")).toBeDefined();

    const failing = createSnapshotCache();
    learnerSnapshot.mockImplementationOnce(() => pending("snapshot:fail", []));
    gateOpen = new Promise<void>((r) => (release = r));
    await settle(startPrelude({ ...base(), cache: failing }));
    expect(failing.get("u1")).toBeUndefined();
  });
});
