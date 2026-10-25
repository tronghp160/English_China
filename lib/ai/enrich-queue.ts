import type { LangCode } from "@/lib/lang/types";
import { cacheKey, getCached, putCached } from "./client-cache";
import type { EnrichResult } from "./schemas";

/**
 * One page-wide queue for AI suggestions: every card's request goes through it
 * and leaves in batches of up to 10 words (/api/ai/enrich-batch), so twenty words
 * cost two model calls instead of twenty. Module singleton, no React state.
 */
export type EnrichJobResult =
  | { ok: true; result: EnrichResult; cached: boolean }
  | { ok: false; error: string; code?: string; retryAfter?: number };

export type EnrichJob = {
  language: LangCode;
  term: string;
  meaning_vi?: string | null;
  /** The user asked for it (button, blur, nothing else to show): send almost at once. */
  urgent?: boolean;
  signal?: AbortSignal;
};

export type QueueState = { pending: number; busyUntil: number | null };

export const BATCH_SIZE = 10;
const DEBOUNCE_MS = 1200;
const URGENT_MS = 150;
/** Resends after a "busy" answer before giving up on a word. */
const MAX_RETRIES = 3;
const DEFAULT_RETRY_AFTER = 20;
const FAILED = "Không lấy được gợi ý lúc này. Thử lại hoặc tự nhập.";

type Waiter = { resolve: (r: EnrichJobResult) => void; signal?: AbortSignal };
type Job = {
  key: string;
  term: string;
  meaning_vi?: string | null;
  urgent: boolean;
  retries: number;
  waiters: Waiter[];
};
type Lane = {
  pending: Job[];
  flying: Job[];
  timer: ReturnType<typeof setTimeout> | null;
  busyUntil: number | null;
  lastAdded: number;
};

let lanes = new Map<LangCode, Lane>();
let quotaError: { error: string; code: string } | null = null;
const listeners = new Set<(s: QueueState) => void>();

function lane(lang: LangCode): Lane {
  let l = lanes.get(lang);
  if (!l) {
    l = { pending: [], flying: [], timer: null, busyUntil: null, lastAdded: 0 };
    lanes.set(lang, l);
  }
  return l;
}

export function queueState(): QueueState {
  let pending = 0;
  let busyUntil: number | null = null;
  for (const l of lanes.values()) {
    pending += l.pending.length + l.flying.length;
    if (l.busyUntil && (!busyUntil || l.busyUntil > busyUntil)) busyUntil = l.busyUntil;
  }
  return { pending, busyUntil };
}

export function subscribe(listener: (s: QueueState) => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

function notify() {
  const s = queueState();
  for (const fn of listeners) fn(s);
}

function settle(job: Job, r: EnrichJobResult) {
  for (const w of job.waiters) w.resolve(r);
  job.waiters = [];
}

const live = (job: Job) => job.waiters.some((w) => !w.signal?.aborted);

function schedule(lang: LangCode) {
  const l = lane(lang);
  if (l.timer) clearTimeout(l.timer);
  l.timer = null;
  if (!l.pending.length || l.flying.length) return;
  const now = Date.now();
  if (l.busyUntil && l.busyUntil > now) {
    l.timer = setTimeout(() => void flush(lang), l.busyUntil - now);
    return;
  }
  if (l.pending.length >= BATCH_SIZE) {
    void flush(lang);
    return;
  }
  const delay = l.pending.some((j) => j.urgent) ? URGENT_MS : DEBOUNCE_MS;
  l.timer = setTimeout(() => void flush(lang), Math.max(0, l.lastAdded + delay - now));
}

async function flush(lang: LangCode) {
  const l = lane(lang);
  if (l.timer) clearTimeout(l.timer);
  l.timer = null;
  if (l.flying.length) return;
  l.busyUntil = null;
  // Words nobody waits for any more (every caller aborted) are not sent.
  l.pending = l.pending.filter(live);
  if (!l.pending.length) return notify();

  const batch = l.pending.splice(0, BATCH_SIZE);
  l.flying = batch;
  notify();

  let res: Response | null = null;
  let body: Record<string, unknown> = {};
  try {
    res = await fetch("/api/ai/enrich-batch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        language: lang,
        items: batch.map((j) => ({ term: j.term, ...(j.meaning_vi ? { meaning_vi: j.meaning_vi } : {}) })),
      }),
    });
    body = await res.json().catch(() => ({}));
  } catch {
    res = null;
  }
  l.flying = [];

  const error = typeof body.error === "string" ? body.error : FAILED;
  const code = typeof body.code === "string" ? body.code : undefined;
  if (res?.ok) {
    const outcomes = (Array.isArray(body.outcomes) ? body.outcomes : []) as (
      | { ok: true; result: EnrichResult; cached?: boolean }
      | { ok: false; error?: string }
    )[];
    batch.forEach((job, i) => {
      const o = outcomes[i];
      if (o?.ok) {
        putCached(lang, job.term, { result: o.result, source: "ai" });
        settle(job, { ok: true, result: o.result, cached: Boolean(o.cached) });
      } else settle(job, { ok: false, error: o?.error || FAILED, code: "failed" });
    });
  } else if (res?.status === 429 && (code === "quota_user" || code === "quota_global")) {
    // Out of AI quota: stop asking for the rest of this page visit.
    quotaError = { error, code };
    for (const job of batch) settle(job, { ok: false, error, code });
    for (const other of lanes.values()) {
      for (const job of other.pending) settle(job, { ok: false, error, code });
      other.pending = [];
      if (other.timer) clearTimeout(other.timer);
      other.timer = null;
    }
  } else if (res?.status === 503 && code === "busy") {
    const retryAfter = Number(body.retryAfter) > 0 ? Number(body.retryAfter) : DEFAULT_RETRY_AFTER;
    const again: Job[] = [];
    for (const job of batch) {
      job.retries++;
      if (job.retries > MAX_RETRIES) settle(job, { ok: false, error, code: "busy", retryAfter });
      else again.push(job);
    }
    l.pending.unshift(...again);
    if (l.pending.length) l.busyUntil = Date.now() + retryAfter * 1000;
  } else {
    for (const job of batch) settle(job, { ok: false, error, code: code ?? "failed" });
  }
  notify();
  schedule(lang);
}

/** Ask the AI for one word. Same word already queued or in flight: shares that answer. */
export function enqueueEnrich(job: EnrichJob): Promise<EnrichJobResult> {
  const { language, signal } = job;
  const term = job.term.trim();
  if (quotaError) return Promise.resolve({ ok: false, ...quotaError });
  if (signal?.aborted) return Promise.resolve({ ok: false, error: "aborted", code: "aborted" });
  const hit = getCached(language, term);
  if (hit && hit.source !== "dict") return Promise.resolve({ ok: true, result: hit.result, cached: true });

  const l = lane(language);
  const key = cacheKey(language, term);
  let existing = l.pending.find((j) => j.key === key) ?? l.flying.find((j) => j.key === key);

  let resolveWaiter!: (r: EnrichJobResult) => void;
  const mine = new Promise<EnrichJobResult>((r) => (resolveWaiter = r));
  const waiter: Waiter = { resolve: resolveWaiter, signal };
  signal?.addEventListener(
    "abort",
    () => {
      resolveWaiter({ ok: false, error: "aborted", code: "aborted" });
      notify();
    },
    { once: true },
  );

  if (existing) {
    existing.waiters.push(waiter);
    if (job.urgent && !existing.urgent && l.pending.includes(existing)) {
      existing.urgent = true;
      l.lastAdded = Date.now();
      schedule(language);
    }
    return mine;
  }
  existing = {
    key,
    term,
    meaning_vi: job.meaning_vi,
    urgent: Boolean(job.urgent),
    retries: 0,
    waiters: [waiter],
  };
  l.pending.push(existing);
  l.lastAdded = Date.now();
  notify();
  schedule(language);
  return mine;
}

/** For tests: drop every queue, timer and the quota stop. */
export function resetEnrichQueue() {
  for (const l of lanes.values()) if (l.timer) clearTimeout(l.timer);
  lanes = new Map();
  quotaError = null;
  listeners.clear();
}
