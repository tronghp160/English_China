"use client";

import { createStore, get, set, type UseStore } from "idb-keyval";
import { submitReviews, type DayStats, type ReviewSubmission } from "@/lib/actions/review";

/**
 * Offline-safe review outbox (docs/PLAN.md §10.3). Results are written to
 * IndexedDB first, then sent in the background; failures are retried when the
 * browser comes back online. Falls back to memory when IndexedDB is blocked.
 */

const KEY = "pending";
let store: UseStore | null | undefined;
let memory: ReviewSubmission[] = [];

function idb(): UseStore | null {
  if (store !== undefined) return store;
  try {
    store = typeof indexedDB === "undefined" ? null : createStore("sotu-outbox", "reviews");
  } catch {
    store = null;
  }
  return store;
}

async function readAll(): Promise<ReviewSubmission[]> {
  const s = idb();
  if (!s) return memory;
  try {
    return ((await get<ReviewSubmission[]>(KEY, s)) ?? []).concat(memory);
  } catch {
    return memory;
  }
}

async function writeAll(items: ReviewSubmission[]) {
  const s = idb();
  if (s) {
    try {
      await set(KEY, items, s);
      memory = [];
      return;
    } catch {
      // fall through to memory
    }
  }
  memory = items;
}

// Serialize every read-modify-write so enqueue and flush never interleave.
let chain: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

export type OutboxStatus = { pending: number; syncing: boolean; error: string | null };
type Listener = (s: OutboxStatus) => void;
const listeners = new Set<Listener>();
let status: OutboxStatus = { pending: 0, syncing: false, error: null };

function emit(patch: Partial<OutboxStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l(status));
}

export function subscribeOutbox(l: Listener) {
  listeners.add(l);
  l(status);
  return () => {
    listeners.delete(l);
  };
}

export type FlushResult = { xpGained: number; stats: DayStats | null };
type ResultListener = (r: FlushResult) => void;
const resultListeners = new Set<ResultListener>();
export function onFlushResult(l: ResultListener) {
  resultListeners.add(l);
  return () => {
    resultListeners.delete(l);
  };
}

export function enqueueReview(item: ReviewSubmission) {
  return locked(async () => {
    const all = await readAll();
    all.push(item);
    await writeAll(all);
    emit({ pending: all.length });
  }).then(() => void flush());
}

let retryTimer: ReturnType<typeof setTimeout> | undefined;
let backoff = 2_000;
let flushing = false;
let flushAgain = false;

/** Removes the given ids from storage (only storage access is locked, never the network call). */
function drop(ids: Set<string>) {
  return locked(async () => {
    const rest = (await readAll()).filter((i) => !ids.has(i.clientId));
    await writeAll(rest);
    return rest.length;
  });
}

export async function flush(): Promise<void> {
  if (flushing) {
    flushAgain = true;
    return;
  }
  flushing = true;
  try {
    const all = await locked(readAll);
    emit({ pending: all.length });
    if (!all.length) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      emit({ error: "Đang mất mạng — kết quả được lưu trên máy và sẽ tự gửi khi có mạng." });
      return;
    }
    emit({ syncing: true });
    const batch = all.slice(0, 50);
    try {
      const res = await submitReviews(batch);
      if (res.ok) {
        const left = await drop(new Set(res.acked));
        emit({ pending: left, error: null });
        backoff = 2_000;
        resultListeners.forEach((l) => l({ xpGained: res.xpGained, stats: res.stats }));
        if (left) flushAgain = true;
      } else if (res.retry) {
        emit({ error: res.error });
        schedule(backoff);
      } else {
        // permanently invalid batch: drop it so it cannot block the queue
        const left = await drop(new Set(batch.map((i) => i.clientId)));
        emit({ pending: left, error: res.error });
      }
    } catch {
      emit({ error: "Chưa gửi được kết quả — sẽ thử lại khi có mạng." });
      schedule(backoff);
    }
  } finally {
    flushing = false;
    emit({ syncing: false });
    if (flushAgain) {
      flushAgain = false;
      void flush();
    }
  }
}

function schedule(ms: number) {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => void flush(), ms);
  backoff = Math.min(backoff * 2, 60_000);
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    backoff = 2_000;
    void flush();
  });
  // Pick up anything left over from a previous visit.
  void flush();
}
