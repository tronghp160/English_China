import type { Metadata } from "next";
import Link from "next/link";
import { ReviewSession, type ReviewItem } from "@/components/review/review-session";
import type { StudyWord } from "@/lib/practice";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ôn tập" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ReviewPage({ searchParams }: PageProps<"/review">) {
  const sp = await searchParams;
  const deckParam = typeof sp.deck === "string" && UUID.test(sp.deck) ? sp.deck : undefined;
  const langParam = sp.lang === "en" || sp.lang === "zh" ? sp.lang : undefined;
  const supabase = await createClient();

  // New words added since the last visit need their cards first.
  await supabase.rpc("ensure_user_cards", { p_deck_id: deckParam });
  const [{ data: due }, { data: overview }] = await Promise.all([
    supabase.rpc("get_due_cards", { p_deck_id: deckParam, p_limit: 200 }),
    supabase.rpc("today_overview"),
  ]);

  const items: ReviewItem[] = (due ?? [])
    .map((c) => ({
      key: `${c.word_id}:${c.direction}`,
      isNew: c.is_new,
      direction: c.direction as ReviewItem["direction"],
      word: c.word as unknown as StudyWord,
      card: {
        state: c.state,
        due: c.due,
        stability: c.stability,
        difficulty: c.difficulty,
        elapsed_days: c.elapsed_days,
        scheduled_days: c.scheduled_days,
        learning_steps: c.learning_steps,
        reps: c.reps,
        lapses: c.lapses,
        last_review: c.last_review,
      },
    }))
    .filter((i) => !langParam || i.word.language === langParam);

  const rows = (overview ?? []).filter((o) => !langParam || o.language === langParam);
  const tomorrowDue = rows.reduce((n, o) => n + Number(o.due_tomorrow), 0);
  const exitHref = deckParam ? `/decks/${deckParam}` : "/today";

  if (!items.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl text-ink">
          <span className="highlighter">Bạn đã ôn xong hôm nay.</span>
        </h1>
        <p className="text-ink-soft">
          {tomorrowDue > 0
            ? `Ngày mai có ${tomorrowDue} từ cần ôn.`
            : "Thêm từ mới để có thẻ ôn ngày mai."}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Link
            href="/today"
            className="inline-flex min-h-12 items-center rounded-btn bg-primary px-5 font-medium text-primary-foreground"
          >
            Về trang Hôm nay
          </Link>
          <Link
            href={deckParam ? `/practice?deck=${deckParam}` : "/practice"}
            className="inline-flex min-h-12 items-center rounded-btn border border-rule bg-surface px-5 font-medium text-ink"
          >
            Luyện tập thêm
          </Link>
        </div>
      </div>
    );
  }

  return <ReviewSession items={items} exitHref={exitHref} tomorrowDue={tomorrowDue} />;
}
