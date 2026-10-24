"use client";

import { readGame, writeGame } from "./game-store";

export type TestScore = { percent: number; correct: number; total: number; at: string };

// Per user and deck (or language), on this device only like the other game records.
const scoreKey = (userId: string, deckKey: string) => `test-last:${userId}:${deckKey}`;

export function getTestScore(userId: string, deckKey: string) {
  return readGame<TestScore>(scoreKey(userId, deckKey));
}

/** Remembers the latest test result (not the best: it tells what to do next). */
export function saveTestScore(userId: string, deckKey: string, score: Omit<TestScore, "at">) {
  return writeGame(scoreKey(userId, deckKey), { ...score, at: new Date().toISOString() });
}
