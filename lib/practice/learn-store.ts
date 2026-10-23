"use client";

import { clearGame, readGame, writeGame } from "./game-store";
import type { LearnState } from "./learn";

// Per user, so a shared device keeps progress apart. Device-only, not synced.
const learnKey = (userId: string, progressKey: string) => `learn:${userId}:${progressKey}`;

export function loadLearn(userId: string, progressKey: string) {
  return readGame<unknown>(learnKey(userId, progressKey));
}

export function saveLearn(userId: string, progressKey: string, state: LearnState) {
  return writeGame(learnKey(userId, progressKey), state);
}

export function clearLearn(userId: string, progressKey: string) {
  return clearGame(learnKey(userId, progressKey));
}
