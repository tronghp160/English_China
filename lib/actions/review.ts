"use server";

import { z } from "zod";
import { getUser } from "@/lib/auth";
import { emptyDbCard, schedule, type DbCard, type RatingValue } from "@/lib/srs/fsrs";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const reviewSchema = z.object({
  clientId: z.string().uuid(),
  wordId: z.string().uuid(),
  direction: z.enum(["recognize", "recall"]),
  mode: z.enum(["flashcard", "quiz", "typing", "listening", "cloze", "writing", "tones"]),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  wasCorrect: z.boolean().nullable(),
  durationMs: z.number().int().min(0).max(3_600_000),
  reviewedAt: z.string().datetime({ offset: true }),
  /** Practice only counts toward the FSRS schedule when the user opted in. */
  updateCard: z.boolean(),
});
export type ReviewSubmission = z.input<typeof reviewSchema>;

const batchSchema = z.array(reviewSchema).min(1).max(50);

export type DayStats = {
  reviews: number;
  correct: number;
  xp: number;
  goal_reached: boolean;
  goal_bonus: number;
};

export type SubmitResult =
  | { ok: true; acked: string[]; xpGained: number; stats: DayStats | null }
  | { ok: false; error: string; retry: boolean };

const MAX_AGE_MS = 7 * 24 * 3_600_000;

/**
 * Record a batch of reviews from the client outbox. The server recomputes the
 * FSRS state from the stored card; the client only sends the rating. Each
 * review has a client id, so resending after a lost response is harmless.
 * Never redirects: it runs in the background, also from the offline queue.
 */
export async function submitReviews(input: ReviewSubmission[]): Promise<SubmitResult> {
  const user = await getUser();
  if (!user)
    return {
      ok: false,
      error: "Phiên đăng nhập đã hết. Đăng nhập lại để lưu kết quả.",
      retry: true,
    };
  const parsed = batchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dữ liệu ôn tập không hợp lệ.", retry: false };

  const supabase = await createClient();
  const admin = createAdminClient();
  const items = [...parsed.data].sort(
    (a, b) => Date.parse(a.reviewedAt) - Date.parse(b.reviewedAt),
  );

  const wordIds = [...new Set(items.map((i) => i.wordId))];
  // RLS: only words in decks the user can read, and only the user's own cards.
  const [{ data: words, error: wordsError }, { data: cards, error: cardsError }] =
    await Promise.all([
      supabase.from("words").select("id").in("id", wordIds),
      supabase
        .from("user_cards")
        .select(
          "word_id, direction, state, due, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, last_review",
        )
        .eq("user_id", user.id)
        .in("word_id", wordIds),
    ]);
  if (wordsError || cardsError)
    return { ok: false, error: "Không kết nối được máy chủ.", retry: true };

  const readable = new Set((words ?? []).map((w) => w.id));
  const cardMap = new Map<string, DbCard>(
    (cards ?? []).map((c) => [`${c.word_id}:${c.direction}`, c]),
  );

  const acked: string[] = [];
  let xpGained = 0;
  let stats: DayStats | null = null;
  const now = Date.now();

  for (const item of items) {
    if (!readable.has(item.wordId)) {
      acked.push(item.clientId); // word deleted or access lost: drop it
      continue;
    }
    const at = Date.parse(item.reviewedAt);
    const reviewedAt = new Date(Math.min(Math.max(at, now - MAX_AGE_MS), now));
    const key = `${item.wordId}:${item.direction}`;
    const current = cardMap.get(key) ?? emptyDbCard(reviewedAt);

    // A review older than the card's last review (late offline resend) is logged
    // but must not rewind the schedule.
    const stale =
      current.last_review !== null && Date.parse(current.last_review) > reviewedAt.getTime();
    const updateCard = item.updateCard && !stale;
    const next = updateCard ? schedule(current, item.rating as RatingValue, reviewedAt) : null;

    const { data, error } = await admin.rpc("record_review", {
      p_user_id: user.id,
      p_word_id: item.wordId,
      p_direction: item.direction,
      p_mode: item.mode,
      p_rating: item.rating,
      p_was_correct: item.wasCorrect as boolean,
      p_duration_ms: item.durationMs,
      p_update_card: updateCard,
      p_card: next ?? {},
      p_reviewed_at: reviewedAt.toISOString(),
      p_client_id: item.clientId,
    });
    if (error) {
      console.error("[review] record_review", error);
      // keep what succeeded; the rest stays in the outbox
      return acked.length
        ? { ok: true, acked, xpGained, stats }
        : { ok: false, error: "Chưa lưu được kết quả, sẽ thử lại.", retry: true };
    }
    if (next) cardMap.set(key, next);
    acked.push(item.clientId);
    const r = (data ?? {}) as Partial<DayStats> & { duplicate?: boolean; xp_gained?: number };
    if (!r.duplicate) {
      xpGained += r.xp_gained ?? 0;
      stats = {
        reviews: r.reviews ?? 0,
        correct: r.correct ?? 0,
        xp: r.xp ?? 0,
        goal_reached: Boolean(r.goal_reached),
        goal_bonus: r.goal_bonus ?? 0,
      };
    }
  }

  return { ok: true, acked, xpGained, stats };
}
