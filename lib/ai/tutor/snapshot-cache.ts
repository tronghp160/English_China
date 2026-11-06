import type { LangSnapshot } from "@/lib/ai/tutor/learner";

export type SnapshotCache = {
  get(userId: string): LangSnapshot[] | undefined;
  set(userId: string, value: LangSnapshot[]): void;
  readonly size: number;
};

/**
 * Small in-memory cache of a learner's snapshot for follow-up messages of a conversation: it saves
 * about five reads per message. Per server instance, so with Fluid Compute (warm instances) it works
 * and elsewhere it just misses. Entries expire after `ttlMs`; the oldest entry goes first when full.
 * A learner who reviews between two messages sees numbers up to `ttlMs` old: fine for a study tutor.
 * `now` is injectable for tests. Never holds anything but the snapshot (no message text).
 */
export function createSnapshotCache({
  ttlMs = 120_000,
  max = 500,
  now = Date.now,
}: { ttlMs?: number; max?: number; now?: () => number } = {}): SnapshotCache {
  const entries = new Map<string, { at: number; value: LangSnapshot[] }>();
  return {
    get(userId) {
      const hit = entries.get(userId);
      if (!hit) return undefined;
      if (now() - hit.at >= ttlMs) {
        entries.delete(userId);
        return undefined;
      }
      return hit.value;
    },
    set(userId, value) {
      entries.delete(userId); // re-insert at the end: Map keeps insertion order, so the first key is the oldest
      entries.set(userId, { at: now(), value });
      while (entries.size > max) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        entries.delete(oldest);
      }
    },
    get size() {
      return entries.size;
    },
  };
}

/** The cache /api/chat uses. */
export const snapshotCache = createSnapshotCache();
