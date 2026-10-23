"use client";

import { readGame, writeGame } from "./game-store";

export type MatchRecord = { ms: number; at: string };

// Per user, so a shared device keeps records apart.
const recordKey = (userId: string, deckKey: string, pairs: number) =>
  `match-best:${userId}:${deckKey}:${pairs}`;

export function getMatchRecord(userId: string, deckKey: string, pairs: number) {
  return readGame<MatchRecord>(recordKey(userId, deckKey, pairs));
}

/** Stores `ms` when it beats the previous record; returns that previous record. */
export async function saveMatchTime(
  userId: string,
  deckKey: string,
  pairs: number,
  ms: number,
): Promise<{ previous: MatchRecord | null; isBest: boolean }> {
  const previous = await getMatchRecord(userId, deckKey, pairs);
  const isBest = !previous || ms < previous.ms;
  if (isBest) await writeGame(recordKey(userId, deckKey, pairs), { ms, at: new Date().toISOString() });
  return { previous, isBest };
}
