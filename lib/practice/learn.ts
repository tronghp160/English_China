import { choiceOptions, type Rng, type StudyWord } from "./index";
import type { Question } from "./questions";

/**
 * Pure logic of the learn mode (docs/PLAN-study-games.md §5). Each word climbs
 * level 0 (new) → 1 (passed multiple choice) → 2 (passed typing = mastered).
 * A round asks up to 7 unmastered words once each; a miss drops the word back
 * to level 0 and asks it again at the end of the same round.
 */

export type LearnLevel = 0 | 1 | 2;
export type LearnWordState = { wordId: string; level: LearnLevel; misses: number };
export type LearnState = {
  version: 1;
  /** Study order. */
  words: LearnWordState[];
  round: number;
  /** Word ids still to ask in this round. */
  queue: string[];
  /** Words of the current round (for the round summary). */
  roundWords: string[];
};

export const LEARN_ROUND_SIZE = 7;

const seen = (w: LearnWordState) => w.level > 0 || w.misses > 0;

export function initLearn(wordIds: string[]): LearnState {
  return {
    version: 1,
    words: [...new Set(wordIds)].map((wordId) => ({ wordId, level: 0, misses: 0 })),
    round: 0,
    queue: [],
    roundWords: [],
  };
}

/** Next round: words in progress first, then new ones in study order. */
export function startRound(state: LearnState, size = LEARN_ROUND_SIZE): LearnState {
  const open = state.words.filter((w) => w.level < 2);
  const picked = [...open.filter(seen), ...open.filter((w) => !seen(w))]
    .slice(0, size)
    .map((w) => w.wordId);
  return { ...state, round: state.round + 1, queue: picked, roundWords: picked };
}

export function levelOf(state: LearnState, wordId: string): LearnLevel {
  return state.words.find((w) => w.wordId === wordId)?.level ?? 0;
}

/** Multiple choice for a new word, typing (meaning → word) for a word at level 1. */
export function questionFor(
  state: LearnState,
  word: StudyWord,
  pool: StudyWord[],
  rng: Rng = Math.random,
): Question {
  const id = `${word.id}:${state.round}:${state.queue.length}:${Math.floor(rng() * 1e6)}`;
  if (levelOf(state, word.id) === 0) {
    const options = choiceOptions(word, pool, rng);
    if (options.length >= 2) {
      const prompt = rng() < 0.5 ? "term" : "meaning";
      return {
        id,
        kind: "choice",
        prompt,
        word,
        answerId: word.id,
        options: options.map((o) => ({ id: o.id, label: prompt === "term" ? o.meaning_vi : o.term })),
      };
    }
  }
  return { id, kind: "typing", word };
}

/** Records an answer to the word at the front of the queue (anything else is ignored). */
export function answer(state: LearnState, wordId: string, correct: boolean): LearnState {
  const at = state.queue.indexOf(wordId);
  if (at < 0) return state;
  const queue = [...state.queue.slice(0, at), ...state.queue.slice(at + 1)];
  const words = state.words.map(
    (w): LearnWordState =>
      w.wordId !== wordId
        ? w
        : correct
          ? { ...w, level: Math.min(w.level + 1, 2) as LearnLevel }
          : { ...w, level: 0, misses: w.misses + 1 },
  );
  // A miss comes back at the end of this round (at least 2 questions later when the round allows).
  if (!correct) queue.push(wordId);
  return { ...state, words, queue };
}

export function roundDone(state: LearnState): boolean {
  return state.queue.length === 0;
}

export function learnComplete(state: LearnState): boolean {
  return state.words.length > 0 && state.words.every((w) => w.level === 2);
}

export function progress(state: LearnState): { notStarted: number; learning: number; mastered: number } {
  let notStarted = 0;
  let learning = 0;
  let mastered = 0;
  for (const w of state.words) {
    if (w.level === 2) mastered++;
    else if (seen(w)) learning++;
    else notStarted++;
  }
  return { notStarted, learning, mastered };
}

/**
 * Lines a saved state up with the words available now: words deleted since
 * are dropped, and new targets are appended at level 0 while the set is
 * smaller than `limit`. Another version, or nothing left, gives null.
 */
export function restoreLearn(
  saved: unknown,
  available: Set<string>,
  targets: string[],
  limit: number,
): LearnState | null {
  const s = saved as LearnState | null;
  if (!s || s.version !== 1 || !Array.isArray(s.words) || !Array.isArray(s.queue)) return null;
  const words = s.words.filter((w) => available.has(w.wordId));
  const known = new Set(words.map((w) => w.wordId));
  for (const id of targets) {
    if (words.length >= limit) break;
    if (!known.has(id)) {
      words.push({ wordId: id, level: 0, misses: 0 });
      known.add(id);
    }
  }
  if (!words.length) return null;
  return {
    version: 1,
    words,
    round: Number(s.round) || 0,
    queue: s.queue.filter((id) => known.has(id)),
    roundWords: (s.roundWords ?? []).filter((id) => known.has(id)),
  };
}
