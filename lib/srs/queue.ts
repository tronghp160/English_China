import type { DbCard } from "./fsrs";

/**
 * In-session review queue (docs/PLAN.md §10.1):
 *   overdue / due cards (oldest first) → learning cards that come due during
 *   the session → new cards (in the order given, already limited per day).
 * A card rated "Quên" goes to the back of the queue. A card whose new due
 * date falls inside the learn-ahead window comes back once it is due — or
 * earlier, when nothing else is left (like Anki's learn-ahead limit).
 */

export const LEARN_AHEAD_MS = 20 * 60_000;

export type QueueItem = { key: string; card: DbCard; isNew: boolean };

export type Queue<T extends QueueItem> = {
  /** Cards waiting their turn, front first. */
  pending: T[];
  /** Cards rescheduled into this session, waiting for their due time. */
  learning: T[];
};

export function buildQueue<T extends QueueItem>(items: T[]): Queue<T> {
  const due = items
    .filter((i) => !i.isNew)
    .sort((a, b) => Date.parse(a.card.due) - Date.parse(b.card.due));
  const fresh = items.filter((i) => i.isNew);
  return { pending: [...due, ...fresh], learning: [] };
}

function earliest<T extends QueueItem>(list: T[]): number {
  let best = -1;
  list.forEach((item, i) => {
    if (best < 0 || Date.parse(item.card.due) < Date.parse(list[best].card.due)) best = i;
  });
  return best;
}

/** The card to show now, or null when the session is finished. Does not mutate. */
export function peek<T extends QueueItem>(q: Queue<T>, now: Date): T | null {
  const i = earliest(q.learning);
  if (i >= 0 && Date.parse(q.learning[i].card.due) <= now.getTime()) return q.learning[i];
  if (q.pending.length) return q.pending[0];
  return i >= 0 ? q.learning[i] : null;
}

/**
 * Remove `current` (the card just answered) and put its updated version back
 * if it is due again within this session.
 */
export function answer<T extends QueueItem>(
  q: Queue<T>,
  current: T,
  updated: T,
  again: boolean,
  now: Date,
): Queue<T> {
  const pending = q.pending.filter((i) => i !== current);
  const learning = q.learning.filter((i) => i !== current);
  const next = { ...updated, isNew: false };
  if (again) pending.push(next);
  else if (Date.parse(next.card.due) - now.getTime() <= LEARN_AHEAD_MS) learning.push(next);
  return { pending, learning };
}

export function remaining(q: Queue<QueueItem>): number {
  return q.pending.length + q.learning.length;
}
