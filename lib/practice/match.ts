import type { LangCode } from "@/lib/lang/types";
import { shuffle, textKey, type Rng, type StudyWord } from "./index";

/** Pure logic of the match game (docs/PLAN-study-games.md §3). */

export type MatchTile = {
  id: string;
  pairId: string;
  side: "term" | "meaning";
  label: string;
  lang: LangCode;
};

export const MATCH_PAIRS_PER_BOARD = 6;
export const MATCH_PENALTY_MS = 1000;

/**
 * Split the words into boards of `pairsPerBoard` pairs (term tile + meaning
 * tile each). Two words with the same term or meaning never share a board,
 * since the player could not tell their tiles apart. A word that fits no
 * board starts a new one; a final board with a single pair is dropped.
 */
export function buildMatchBoards(
  words: StudyWord[],
  pairsPerBoard = MATCH_PAIRS_PER_BOARD,
  rng: Rng = Math.random,
): MatchTile[][] {
  const boards: { words: StudyWord[]; keys: Set<string> }[] = [];
  for (const w of shuffle(words, rng)) {
    const keys = [`t:${textKey(w.term)}`, `m:${textKey(w.meaning_vi)}`];
    let board = boards.find(
      (b) => b.words.length < pairsPerBoard && !keys.some((k) => b.keys.has(k)),
    );
    if (!board) {
      board = { words: [], keys: new Set() };
      boards.push(board);
    }
    board.words.push(w);
    keys.forEach((k) => board.keys.add(k));
  }
  return boards
    .filter((b) => b.words.length >= 2)
    .map((b) =>
      shuffle(
        b.words.flatMap((w): MatchTile[] => [
          { id: `${w.id}:t`, pairId: w.id, side: "term", label: w.term, lang: w.language },
          { id: `${w.id}:m`, pairId: w.id, side: "meaning", label: w.meaning_vi, lang: w.language },
        ]),
        rng,
      ),
    );
}

export function isPair(a: MatchTile, b: MatchTile): boolean {
  return a.pairId === b.pairId && a.side !== b.side;
}

/** "12,3 giây", "1 phút 05,2 giây". */
export function formatMs(ms: number): string {
  const tenths = Math.max(0, Math.round(ms / 100));
  const min = Math.floor(tenths / 600);
  const sec = ((tenths % 600) / 10).toFixed(1).replace(".", ",");
  return min ? `${min} phút ${sec.padStart(4, "0")} giây` : `${sec} giây`;
}
