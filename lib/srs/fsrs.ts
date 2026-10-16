import { fsrs, generatorParameters, Rating, State, type Card, type Grade } from "ts-fsrs";
import type { Database } from "@/lib/supabase/database.types";

/**
 * FSRS scheduling (docs/PLAN.md §10.1). Pure and shared by client (interval
 * preview) and server (authoritative state written by record_review).
 * Fuzz is seeded from the card + review time, so both sides agree when they
 * pass the same `now`.
 */

export type CardState = Database["public"]["Enums"]["card_state"];

/** Card fields as stored in user_cards (dates as ISO strings). */
export type DbCard = {
  state: CardState;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  last_review: string | null;
};

export type RatingValue = 1 | 2 | 3 | 4;

export const RATINGS: { value: RatingValue; label: string; key: string }[] = [
  { value: 1, label: "Quên", key: "1" },
  { value: 2, label: "Khó", key: "2" },
  { value: 3, label: "Nhớ", key: "3" },
  { value: 4, label: "Dễ", key: "4" },
];

export const scheduler = fsrs(generatorParameters({ request_retention: 0.9, enable_fuzz: true }));

const TO_STATE: Record<CardState, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};
const FROM_STATE: Record<State, CardState> = {
  [State.New]: "new",
  [State.Learning]: "learning",
  [State.Review]: "review",
  [State.Relearning]: "relearning",
};

export function emptyDbCard(now = new Date()): DbCard {
  return {
    state: "new",
    due: now.toISOString(),
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: 0,
    lapses: 0,
    last_review: null,
  };
}

export function toFsrs(c: DbCard): Card {
  return {
    due: new Date(c.due),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: TO_STATE[c.state],
    last_review: c.last_review ? new Date(c.last_review) : undefined,
  };
}

export function fromFsrs(c: Card): DbCard {
  return {
    state: FROM_STATE[c.state],
    due: c.due.toISOString(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    last_review: c.last_review ? c.last_review.toISOString() : null,
  };
}

const GRADE: Record<RatingValue, Grade> = {
  1: Rating.Again,
  2: Rating.Hard,
  3: Rating.Good,
  4: Rating.Easy,
};

export function schedule(card: DbCard, rating: RatingValue, now: Date): DbCard {
  return fromFsrs(scheduler.next(toFsrs(card), now, GRADE[rating]).card);
}

/** Next due date for each rating, for the labels under the rating buttons. */
export function previewDue(card: DbCard, now: Date): Record<RatingValue, Date> {
  const p = scheduler.repeat(toFsrs(card), now);
  return {
    1: p[Rating.Again].card.due,
    2: p[Rating.Hard].card.due,
    3: p[Rating.Good].card.due,
    4: p[Rating.Easy].card.due,
  };
}
