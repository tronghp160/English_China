"use client";

import { useEffect, useState } from "react";
import { useOptionalMe } from "@/components/app-shell/me-provider";
import type { LearnState } from "@/lib/practice/learn";
import { loadLearn } from "@/lib/practice/learn-store";
import { getMatchRecord } from "@/lib/practice/match-records";
import type { ModeStats } from "@/lib/practice/suggest";
import { getTestScore } from "@/lib/practice/test-records";

const EMPTY: ModeStats = { learnPercent: null, testPercent: null, matchMs: null };

/**
 * What this device remembers about a deck (or "lang:en" for a whole language): the share of words learned in
 * Learn, the last test score, the Match record for `matchPairs` pairs. Empty until it is read, and when
 * nothing was saved, so nothing is shown that is not known.
 */
export function useModeStats(deckKey: string, matchPairs: number): ModeStats {
  const userId = useOptionalMe()?.userId;
  const [state, setState] = useState<{ key: string; stats: ModeStats }>({ key: "", stats: EMPTY });
  const key = `${userId}:${deckKey}:${matchPairs}`;

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    void Promise.all([loadLearn(userId, `${deckKey}:all`), getTestScore(userId, deckKey), getMatchRecord(userId, deckKey, matchPairs)]).then(
      ([raw, test, match]) => {
        if (!alive) return;
        const learn = raw as LearnState | null;
        const learnPercent =
          learn?.version === 1 && Array.isArray(learn.words) && learn.words.length
            ? Math.round((learn.words.filter((w) => w.level >= 2).length / learn.words.length) * 100)
            : null;
        setState({ key, stats: { learnPercent, testPercent: test?.percent ?? null, matchMs: match?.ms ?? null } });
      },
    );
    return () => {
      alive = false;
    };
  }, [userId, deckKey, matchPairs, key]);

  return state.key === key ? state.stats : EMPTY;
}
