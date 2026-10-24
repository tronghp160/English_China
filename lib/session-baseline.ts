"use client";

import { loadSessionRewards, type SessionRewardData } from "@/lib/actions/bin";

/**
 * The totals (XP, right answers, streak) as they were when a session began, so its end screen can say what the
 * session earned, goal bonus included. The first session screen asks for them; the end screen takes them (once),
 * so the next session asks again. A session that is left halfway keeps its baseline for the next one.
 */
let baseline: Promise<SessionRewardData | null> | null = null;

export function beginSessionBaseline() {
  if (baseline) return;
  baseline = loadSessionRewards()
    .then((r) => (r.ok ? r.data : null))
    .catch(() => null);
}

export function takeSessionBaseline(): Promise<SessionRewardData | null> {
  const taken = baseline;
  baseline = null;
  return taken ?? Promise.resolve(null);
}
