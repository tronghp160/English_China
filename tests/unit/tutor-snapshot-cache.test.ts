import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { createSnapshotCache } = await import("@/lib/ai/tutor/snapshot-cache");

const snap = (total: number) => [{ language: "en" as const, total, due: 0, hard: [], recent: [] }];

describe("snapshot cache", () => {
  it("returns a stored snapshot until it is older than the TTL", () => {
    let t = 1_000;
    const cache = createSnapshotCache({ ttlMs: 120_000, now: () => t });
    cache.set("u1", snap(5));
    expect(cache.get("u1")).toEqual(snap(5));
    t += 119_999;
    expect(cache.get("u1")).toEqual(snap(5));
    t += 1;
    expect(cache.get("u1")).toBeUndefined();
    expect(cache.size).toBe(0); // the expired entry is dropped, not kept
  });

  it("never mixes users", () => {
    const cache = createSnapshotCache();
    cache.set("u1", snap(1));
    cache.set("u2", snap(2));
    expect(cache.get("u1")?.[0].total).toBe(1);
    expect(cache.get("u2")?.[0].total).toBe(2);
    expect(cache.get("u3")).toBeUndefined();
  });

  it("drops the oldest entry when full", () => {
    const cache = createSnapshotCache({ max: 3 });
    for (const id of ["a", "b", "c"]) cache.set(id, snap(1));
    cache.set("d", snap(1));
    expect(cache.size).toBe(3);
    expect(cache.get("a")).toBeUndefined();
    for (const id of ["b", "c", "d"]) expect(cache.get(id)).toBeDefined();
  });

  it("a refreshed entry counts as the newest and restarts its TTL", () => {
    let t = 0;
    const cache = createSnapshotCache({ max: 2, ttlMs: 100, now: () => t });
    cache.set("a", snap(1));
    cache.set("b", snap(1));
    t = 90;
    cache.set("a", snap(2)); // a is now newer than b
    cache.set("c", snap(1)); // evicts b, not a
    expect(cache.get("b")).toBeUndefined();
    t = 150; // 60 ms after a was refreshed, 150 after it was first stored
    expect(cache.get("a")?.[0].total).toBe(2);
  });
});
