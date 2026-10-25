import type { LangCode } from "@/lib/lang/types";
import type { EnrichResult } from "./schemas";

/**
 * Browser-side memory of word lookups: typing a word again shows it at once
 * with no request. Kept in a Map and mirrored to sessionStorage (per tab).
 */
export type CacheSource = "ai" | "cache" | "dict";
export type CacheEntry = { result: EnrichResult; source: CacheSource; at: number };

/** Bump together with PROMPT_VERSION so old answers are dropped. */
export const CLIENT_CACHE_KEY = "sotu:lookup:v1";
const MAX = 300;

const mem = new Map<string, CacheEntry>();
let loaded = false;

export function cacheKey(lang: LangCode, term: string) {
  const t = term.trim().replace(/\s+/g, " ");
  return `${lang}:${lang === "en" ? t.toLowerCase() : t}`;
}

function storage(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = storage()?.getItem(CLIENT_CACHE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as [string, CacheEntry][];
    for (const [k, v] of saved) if (!mem.has(k)) mem.set(k, v);
  } catch {
    // Unreadable or blocked storage: the in-memory map still works.
  }
}

function save() {
  try {
    storage()?.setItem(CLIENT_CACHE_KEY, JSON.stringify([...mem.entries()]));
  } catch {
    // Quota or private mode: keep the in-memory copy only.
  }
}

export function getCached(lang: LangCode, term: string): CacheEntry | null {
  load();
  return mem.get(cacheKey(lang, term)) ?? null;
}

/** Keeps an AI answer over a later dictionary answer for the same word. */
export function putCached(lang: LangCode, term: string, entry: Omit<CacheEntry, "at"> & { at?: number }): void {
  load();
  const key = cacheKey(lang, term);
  const old = mem.get(key);
  if (old && old.source !== "dict" && entry.source === "dict") return;
  mem.delete(key);
  mem.set(key, { ...entry, at: entry.at ?? Date.now() });
  while (mem.size > MAX) {
    let oldest: string | null = null;
    let oldestAt = Infinity;
    for (const [k, v] of mem) {
      if (v.at < oldestAt) {
        oldest = k;
        oldestAt = v.at;
      }
    }
    if (oldest === null) break;
    mem.delete(oldest);
  }
  save();
}

/** For tests: forget everything, including what was loaded from storage. */
export function clearClientCache() {
  mem.clear();
  loaded = false;
}
