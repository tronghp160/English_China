import type { Metadata } from "next";
import Link from "next/link";
import { Flame, PenLine, Play, Plus } from "lucide-react";
import { Heatmap } from "@/components/stats/heatmap";
import { getMyDecks } from "@/lib/data/decks";
import { getStudySummary } from "@/lib/data/study";
import { LANGUAGES } from "@/lib/lang/registry";

export const metadata: Metadata = { title: "Hôm nay" };

function SecondaryLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: typeof Plus;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[10px] border border-rule bg-surface px-4 font-medium text-ink hover:bg-muted"
    >
      <Icon className="size-4 text-ink-soft" aria-hidden />
      {children}
    </Link>
  );
}

export default async function TodayPage() {
  const [s, decks] = await Promise.all([getStudySummary(), getMyDecks()]);
  const due = s.langs.reduce((n, l) => n + l.due, 0);
  const fresh = s.langs.reduce((n, l) => n + l.newToday, 0);
  const tomorrow = s.langs.reduce((n, l) => n + l.dueTomorrow, 0);
  const ownDeck = decks.find((d) => d.relation === "own");
  const addHref = ownDeck ? `/decks/${ownDeck.id}/add` : "/decks/new";
  const goalPct = Math.min(100, Math.round((s.reviewedToday / s.goal) * 100));
  const split = s.langs.filter((l) => l.due + l.newToday > 0).length > 1;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-ink-soft">Chào {s.me.profile.display_name}</p>

      {s.totalCards === 0 ? (
        <section className="notebook-card py-8 pr-5">
          <h1 className="text-2xl font-bold text-ink">Chưa có từ nào cần ôn.</h1>
          <p className="mt-2 text-ink-soft">
            Thêm từ đầu tiên của bạn — như ghi vào một trang vở mới.
          </p>
          <Link
            href={addHref}
            className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-[10px] bg-primary px-5 font-medium text-primary-foreground"
          >
            <Plus className="size-4" aria-hidden />
            {ownDeck ? "Thêm từ đầu tiên" : "Tạo bộ từ đầu tiên"}
          </Link>
        </section>
      ) : due + fresh === 0 ? (
        <section className="notebook-card py-8 pr-5">
          <h1 className="text-2xl font-bold text-ink">
            <span className="highlighter">Bạn đã ôn xong hôm nay.</span>
          </h1>
          <p className="mt-2 text-ink-soft">
            {tomorrow > 0
              ? `Ngày mai có ${tomorrow} từ cần ôn.`
              : "Ngày mai chưa có từ nào đến hạn."}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <SecondaryLink href="/practice" icon={PenLine}>
              Luyện tập thêm
            </SecondaryLink>
            <SecondaryLink href={addHref} icon={Plus}>
              Thêm từ
            </SecondaryLink>
          </div>
        </section>
      ) : (
        <section className="notebook-card py-6 pr-5" aria-labelledby="today-due">
          <h1 id="today-due" className="flex items-baseline gap-3">
            <span className="text-6xl font-bold text-ink tabular-nums">{due}</span>
            <span className="text-lg text-ink">từ cần ôn</span>
          </h1>
          <p className="mt-1 text-ink-soft">
            {fresh > 0 ? `và ${fresh} từ mới sẽ học hôm nay` : "Không có từ mới hôm nay"}
          </p>

          {split && (
            <ul className="mt-4 flex flex-col gap-1">
              {s.langs.map((l) => (
                <li key={l.language}>
                  <Link
                    href={`/review?lang=${l.language}`}
                    className="-mx-2 flex min-h-11 items-center gap-3 rounded-[10px] px-2 hover:bg-muted"
                  >
                    <span aria-hidden className="text-xl">
                      {LANGUAGES[l.language].flag}
                    </span>
                    <span className="flex-1 text-ink">{LANGUAGES[l.language].label}</span>
                    <span className="text-sm text-ink-soft tabular-nums">
                      {l.due} cần ôn · {l.newToday} mới
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/review"
            className="mt-5 flex min-h-14 items-center justify-center gap-2 rounded-[10px] bg-primary text-lg font-medium text-primary-foreground"
          >
            <Play className="size-5" aria-hidden />
            Bắt đầu ôn
          </Link>
          <div className="mt-2 flex gap-2">
            <SecondaryLink href={addHref} icon={Plus}>
              Thêm từ
            </SecondaryLink>
            <SecondaryLink href="/practice" icon={PenLine}>
              Luyện tập
            </SecondaryLink>
          </div>
        </section>
      )}

      {s.totalCards > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-[12px] border border-rule bg-surface p-4">
            <h2 className="text-sm font-medium text-ink-soft">Chuỗi ngày</h2>
            <p className="mt-1 flex items-center gap-2">
              <Flame
                className={s.streak.current ? "size-6 text-margin-red" : "size-6 text-ink-soft"}
                aria-hidden
              />
              <span className="text-3xl font-bold text-ink tabular-nums">{s.streak.current}</span>
              <span className="text-ink">ngày</span>
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              {s.streak.restUsedThisWeek
                ? "Đã dùng ngày nghỉ miễn phí của tuần này."
                : "Tuần này còn 1 ngày nghỉ miễn phí — bỏ lỡ 1 ngày vẫn giữ chuỗi."}
              {!s.streak.activeToday &&
                s.streak.current > 0 &&
                " Ôn ít nhất 1 thẻ hôm nay để nối dài chuỗi."}
            </p>
          </section>

          <section className="rounded-[12px] border border-rule bg-surface p-4">
            <h2 className="text-sm font-medium text-ink-soft">Mục tiêu hôm nay</h2>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-ink tabular-nums">{s.reviewedToday}</span>
              <span className="text-ink">/ {s.goal} lượt</span>
              <span className="ml-auto text-sm text-ink-soft tabular-nums">+{s.xpToday} XP</span>
            </p>
            <div
              role="meter"
              aria-label="Tiến độ mục tiêu ngày"
              aria-valuemin={0}
              aria-valuemax={s.goal}
              aria-valuenow={Math.min(s.reviewedToday, s.goal)}
              className="mt-3 h-2.5 overflow-hidden rounded-full bg-wash-blue"
            >
              <div className="h-full rounded-full bg-ink-blue" style={{ width: `${goalPct}%` }} />
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              {goalPct >= 100
                ? "Đã đạt mục tiêu, +10 XP thưởng."
                : "Đạt mục tiêu được thưởng 10 XP."}
            </p>
          </section>

          <section className="rounded-[12px] border border-rule bg-surface p-4 sm:col-span-2">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-medium text-ink-soft">12 tuần gần đây</h2>
              <Link href="/stats" className="text-sm text-ink-blue hover:underline">
                Thống kê
              </Link>
            </div>
            <Heatmap
              days={s.days.map((d) => ({ day: d.day, reviews: d.reviews }))}
              today={s.today}
              restDays={s.streak.restDays}
            />
          </section>
        </div>
      )}
    </div>
  );
}
