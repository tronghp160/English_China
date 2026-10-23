"use client";

import { createStore, del, get, set, type UseStore } from "idb-keyval";

/**
 * Small IndexedDB store for the study games (match records, learn progress).
 * Kept on this device only; every call swallows storage errors so a blocked
 * or full IndexedDB never breaks a game.
 */

let store: UseStore | null | undefined;

function idb(): UseStore | null {
  if (store !== undefined) return store;
  try {
    store = typeof indexedDB === "undefined" ? null : createStore("sotu-games", "kv");
  } catch {
    store = null;
  }
  return store;
}

export async function readGame<T>(key: string): Promise<T | null> {
  const s = idb();
  if (!s) return null;
  try {
    return (await get<T>(key, s)) ?? null;
  } catch {
    return null;
  }
}

export async function writeGame(key: string, value: unknown): Promise<void> {
  const s = idb();
  if (!s) return;
  try {
    await set(key, value, s);
  } catch {
    // not saved; the game goes on
  }
}

export async function clearGame(key: string): Promise<void> {
  const s = idb();
  if (!s) return;
  try {
    await del(key, s);
  } catch {
    // ignore
  }
}
