import { isComboMilestone } from "@/lib/combo";
import type { LineKey } from "./lines";

export type TalkEvent = { correct: boolean; close?: boolean; wordId?: string; term?: string };
export type TalkState = {
  answers: number; // answers so far in this session
  combo: number; // after this answer
  wrongRun: number; // wrong answers in a row, after this answer
  missed: Set<string>; // word ids answered wrong earlier in this session
  lastTalkAt: number; // value of `answers` when Bin last talked (-Infinity at start)
  halfwaySaid: boolean;
};
export type Talk = { key: LineKey; n?: number; word?: string };

export const TALK_GAP = 4; // at least this many answers between two lines, except milestones

export function initialTalkState(): TalkState {
  return {
    answers: 0,
    combo: 0,
    wrongRun: 0,
    missed: new Set<string>(),
    lastTalkAt: -Infinity,
    halfwaySaid: false,
  };
}

/** Pure: the next state and what Bin says (or null). `progress` = done / total, 0..1. */
export function nextTalk(
  prev: TalkState,
  e: TalkEvent,
  progress: number,
): { state: TalkState; talk: Talk | null } {
  const answers = prev.answers + 1;
  const isRight = e.correct;
  const combo = isRight ? prev.combo + 1 : 0;
  const wrongRun = isRight ? 0 : prev.wrongRun + 1;
  const missed = new Set(prev.missed);

  if (!isRight && !e.close && e.wordId) {
    missed.add(e.wordId);
  }

  const prevWrongRun = prev.wrongRun;

  let candidate: Talk | null = null;
  let isMilestone = false;
  let halfwaySaid = prev.halfwaySaid;

  // Priority rules:
  // 1. isComboMilestone(combo) (5, 10, 20, 30…) -> comboTalk (no TALK_GAP needed)
  if (isRight && isComboMilestone(combo)) {
    candidate = { key: "comboTalk", n: combo };
    isMilestone = true;
  }
  // 2. Câu đúng, có wordId nằm trong missed -> redeem, word: term, xóa id khỏi missed
  else if (isRight && e.wordId && missed.has(e.wordId)) {
    missed.delete(e.wordId);
    candidate = { key: "redeem", word: e.term };
  }
  // 3. Câu đúng ngay sau wrongRun >= 2 -> comeback
  else if (isRight && prevWrongRun >= 2) {
    candidate = { key: "comeback" };
  }
  // 4. Câu sai làm wrongRun === 3 -> wrongRun
  else if (!isRight && wrongRun === 3) {
    candidate = { key: "wrongRun" };
  }
  // 5. progress >= 0.5 lần đầu và answers >= 8 -> halfway
  else if (!prev.halfwaySaid && progress >= 0.5 && answers >= 8) {
    candidate = { key: "halfway" };
    halfwaySaid = true;
  }

  let talk: Talk | null = null;
  let lastTalkAt = prev.lastTalkAt;

  if (candidate) {
    if (isMilestone || answers - prev.lastTalkAt >= TALK_GAP) {
      talk = candidate;
      lastTalkAt = answers;
    }
  }

  const state: TalkState = {
    answers,
    combo,
    wrongRun,
    missed,
    lastTalkAt,
    halfwaySaid,
  };

  return { state, talk };
}
