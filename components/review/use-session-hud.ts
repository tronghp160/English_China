"use client";

import { useCallback, useRef, useState } from "react";
import { isComboMilestone, nextCombo } from "@/lib/combo";
import { haptic } from "@/lib/haptics";
import { initialTalkState, nextTalk, type Talk } from "@/lib/mascot/session-talk";
import { playSfx } from "@/lib/sfx";

/** The little "answer" the bar reacts to: which kind and a counter so the same kind twice in a row still counts. */
export type SessionReaction = { kind: "correct" | "wrong" | "close"; n: number };

export type HudTalk = Talk & { id: number; n?: number };

export type SessionHud = {
  combo: number;
  /** Highest combo of the session so far */
  best: number;
  /** XP earned in this session: one per right answer, like the server counts it. */
  xp: number;
  /** One more for every answer: a key for effects that must play once per answer. */
  answers: number;
  reaction: SessionReaction | null;
  talk: HudTalk | null;
  /** Call once per answered question. Plays the sound and the vibration, moves combo and XP. */
  answer: (result: {
    correct: boolean;
    close?: boolean;
    word?: { id: string; term: string };
    progress?: number;
  }) => void;
};

/**
 * Combo, session XP and the right sounds for a study session (REDESIGN_V3 §7.1, §7.2): a right answer rings, adds
 * one XP and one to the combo and, at a combo milestone, plays the arpeggio; a wrong one drops the combo to 0.
 * Pure state plus calls to lib/sfx and lib/haptics, which are silent without a gesture or when switched off.
 */
export function useSessionHud(): SessionHud {
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [xp, setXp] = useState(0);
  const [answers, setAnswers] = useState(0);
  const [reaction, setReaction] = useState<SessionReaction | null>(null);
  const [talk, setTalk] = useState<HudTalk | null>(null);
  const comboRef = useRef(0);
  const countRef = useRef(0);
  const talkRef = useRef(initialTalkState());

  const answer = useCallback(
    ({
      correct,
      close,
      word,
      progress = 0,
    }: {
      correct: boolean;
      close?: boolean;
      word?: { id: string; term: string };
      progress?: number;
    }) => {
      const next = nextCombo(comboRef.current, correct);
      comboRef.current = next;
      countRef.current += 1;
      setCombo(next);
      setBest((b) => Math.max(b, next));
      setAnswers(countRef.current);
      setReaction({ kind: close ? "close" : correct ? "correct" : "wrong", n: countRef.current });

      const talkRes = nextTalk(
        talkRef.current,
        { correct, close, wordId: word?.id, term: word?.term },
        progress,
      );
      talkRef.current = talkRes.state;
      if (talkRes.talk) {
        setTalk({ ...talkRes.talk, id: countRef.current, n: talkRes.talk.n });
      }

      if (correct) {
        setXp((x) => x + 1);
        playSfx("correct");
        haptic("success");
        if (isComboMilestone(next)) window.setTimeout(() => playSfx("combo", { combo: next }), 200);
      } else {
        playSfx("wrong");
        haptic("error");
      }
    },
    [],
  );

  return { combo, best, xp, answers, reaction, talk, answer };
}
