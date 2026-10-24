import type { Metadata } from "next";
import Link from "next/link";
import { Check, Compass, PenLine, Play, Plus } from "lucide-react";
import { ContactLinks } from "@/components/contact/contact-links";
import { DeckCover } from "@/components/deck/deck-cover";
import { SampleDecksButton } from "@/components/deck/sample-decks-button";
import { LangMark } from "@/components/lang-mark";
import { MascotSay } from "@/components/mascot/mascot-say";
import { SealStamp } from "@/components/review/seal-stamp";
import { Heatmap } from "@/components/stats/heatmap";
import { StreakWeek } from "@/components/stats/streak-week";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTACT } from "@/lib/contact";
import { getMyDecks } from "@/lib/data/decks";
import { getStudySummary } from "@/lib/data/study";
import { say, type LineKey, type PupMood } from "@/lib/mascot/lines";
import { cn } from "@/lib/utils";
import { readPrefs } from "@/lib/validation";

export const metadata: Metadata = { title: "Hôm nay" };

function greeting(timeZone: string) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone }).format(new Date()),
  );
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

/** "Thứ Sáu, 23 tháng 10" for the study day (it rolls over at 04:00 in the user's timezone). */
function dateLine(day: string) {
  return new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}

/** One line of the "due" sentence: a big serif number and its words sitting on the same ruled line. */
function SentenceLine({ n, lead, children }: { n: number; lead?: string; children: React.ReactNode }) {
  return (
    <span className="flex h-16 items-end">
      <span className="flex items-baseline gap-2.5 leading-none">
        {lead && <span className="text-lg leading-none text-fg-muted">{lead}</span>}
        <span className="font-display text-[3rem] leading-none font-semibold text-fg tabular-nums">{n}</span>
        <span className="text-lg leading-none text-fg">{children}</span>
      </span>
    </span>
  );
}

export default async function TodayPage() {
  const [s, decks] = await Promise.all([getStudySummary(), getMyDecks()]);
  const due = s.langs.reduce((n, l) => n + l.due, 0);
  const fresh = s.langs.reduce((n, l) => n + l.newToday, 0);
  const tomorrow = s.langs.reduce((n, l) => n + l.dueTomorrow, 0);
  const ownDeck = decks.find((d) => d.relation === "own");
  const addHref = ownDeck ? `/decks/${ownDeck.id}/add` : "/decks/new";
  const split = s.langs.filter((l) => l.due + l.newToday > 0).length > 1;
  const firstName = s.me.profile.display_name.split(/\s+/).at(-1);
  const prefs = readPrefs(s.me.settings.prefs);
  const [mood, line]: [PupMood, LineKey] =
    s.totalCards === 0
      ? ["wave", "empty"]
      : s.streak.current > 0 && !s.streak.activeToday
        ? ["sleepy", "streakAtRisk"]
        : due + fresh === 0
          ? ["cheer", "allDone"]
          : due + fresh >= 50
            ? ["surprised", "dueMany"]
            : ["happy", "due"];
  const seed = new Date(s.today).getUTCDate();
  const text = say(line, {
    seed,
    name: prefs.mascot_name,
    n: line === "streakAtRisk" ? s.streak.current : due + fresh,
  });
  const minutes = Math.max(1, Math.ceil(((due + fresh) * 20) / 60));
  const activeDays = s.days.filter((d) => d.reviews > 0).map((d) => d.day);
  const topDecks = [...decks].sort((a, b) => Number(b.due_count) - Number(a.due_count)).slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-sm font-medium text-fg-muted">{dateLine(s.today)}</p>
        <h1 className="mt-0.5 text-xl">
          {greeting(s.me.settings.timezone)}, {firstName}!
        </h1>
        {prefs.mascot ? (
          <MascotSay mood={mood} name={prefs.mascot_name} text={text} size={56} className="mt-3" />
        ) : (
          <p className="mt-1 text-fg-muted">{text}</p>
        )}
      </header>

      {/* Phones: one column (card, shortcuts, streak, weeks). Laptops: main column + a right column (streak, decks). */}
      <div
        className={cn(
          "flex flex-col gap-8",
          s.totalCards > 0 && "lg:grid lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start lg:gap-x-12",
        )}
      >
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          {s.totalCards === 0 ? (
            <section className="rounded-lg border border-border/60 bg-surface shadow-sm">
              <EmptyState
                figure={prefs.mascot ? null : "notebook"}
                title="Sổ của bạn còn trống."
                actions={
                  <>
                    <SampleDecksButton variant="default" />
                    <Button asChild variant="outline">
                      <Link href={addHref}>
                        <Plus aria-hidden />
                        {ownDeck ? "Thêm từ đầu tiên" : "Tạo bộ từ của tôi"}
                      </Link>
                    </Button>
                  </>
                }
              >
                Thêm vài bộ từ mẫu để thử ngay, hoặc tự tạo bộ từ đầu tiên.
              </EmptyState>
            </section>
          ) : due + fresh === 0 ? (
            <section className="rounded-lg border border-border/60 bg-surface shadow-sm relative overflow-hidden" aria-labelledby="today-done">
              <div className=" pr-5 pl-4">
                <h2 id="today-done" className="flex h-16 items-end pr-28 text-lg leading-none font-medium text-fg">
                  Hôm nay ôn xong rồi.
                </h2>
                <p className="flex h-16 items-end pr-28 text-lg leading-none text-fg-muted">
                  {tomorrow > 0 ? `Ngày mai có ${tomorrow} từ.` : "Ngày mai chưa có từ nào đến hạn."}
                </p>
              </div>
              <SealStamp text="Xong bài" size={84} className="absolute top-4 right-5" />
              <div className="border-t border-border px-5 py-4 pl-4">
                <Button asChild variant="outline">
                  <Link href="/practice">
                    <PenLine aria-hidden />
                    Luyện thêm
                  </Link>
                </Button>
              </div>
            </section>
          ) : (
            <section className="rounded-lg border border-border/60 bg-surface shadow-sm overflow-hidden" aria-labelledby="today-due">
              <div className=" pr-5 pl-4">
                <h2 id="today-due" className="flex flex-col">
                  <SentenceLine n={due}>từ đến hạn ôn</SentenceLine>
                  {fresh > 0 && (
                    <SentenceLine n={fresh} lead="và">
                      từ mới
                    </SentenceLine>
                  )}
                </h2>
              </div>
              {split && (
                <ul className="divide-y divide-border border-t border-border pl-2">
                  {s.langs.map((l) => (
                    <li key={l.language}>
                      <Link
                        href={`/review?lang=${l.language}`}
                        className="flex min-h-12 items-center gap-3 pr-4 text-sm text-fg hover:bg-surface-2"
                      >
                        <LangMark lang={l.language} label />
                        <span className="tabular-nums">
                          {l.due} ôn, {l.newToday} mới
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border py-4 pr-5 pl-4">
                <Button asChild size="lg">
                  <Link href="/review">
                    <Play className="fill-current" aria-hidden />
                    Bắt đầu ôn
                  </Link>
                </Button>
                <span className="text-sm text-fg-muted">khoảng {minutes} phút</span>
              </div>
            </section>
          )}
        </div>

        {s.totalCards > 0 && (
          <>
            <div className="min-w-0 lg:col-start-1 lg:row-start-2">
              <nav aria-label="Lối tắt" className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                <Button asChild variant="outline" className="px-2 sm:px-4">
                  <Link href={addHref}>
                    <Plus aria-hidden />
                    Thêm từ
                  </Link>
                </Button>
                <Button asChild variant="outline" className="px-2 sm:px-4">
                  <Link href="/practice">
                    <PenLine aria-hidden />
                    Luyện tập
                  </Link>
                </Button>
                <Button asChild variant="outline" className="px-2 sm:px-4">
                  <Link href="/explore">
                    <Compass aria-hidden />
                    Khám phá
                  </Link>
                </Button>
              </nav>
            </div>

            <aside className="flex min-w-0 flex-col gap-8 lg:col-start-2 lg:row-span-3 lg:row-start-1">
              <StreakWeek streak={s.streak} today={s.today} activeDays={activeDays} />

              {decks.length > 0 && (
                <section aria-labelledby="today-decks" className="hidden lg:block">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 id="today-decks" className="text-base">
                      Bộ từ
                    </h2>
                    <Link href="/decks" className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">
                      Tất cả
                    </Link>
                  </div>
                  <ul className="divide-y divide-border border-y border-border">
                    {topDecks.map((d) => (
                      <li key={d.id}>
                        <Link href={`/decks/${d.id}`} className="-mx-2 flex min-h-14 items-center gap-3 rounded-md px-2 py-2 hover:bg-surface-2">
                          <DeckCover id={d.id} language={d.language} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-fg">{d.name}</span>
                            <span className="block text-xs text-fg-muted">{d.word_count} từ</span>
                          </span>
                          {d.due_count > 0 ? (
                            <span className="shrink-0 text-sm font-semibold text-danger-fg tabular-nums">{d.due_count} ôn</span>
                          ) : (
                            <Check className="size-4 shrink-0 text-success" aria-label="Đã ôn xong" />
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </aside>

            <div className="min-w-0 lg:col-start-1 lg:row-start-3">
              <section aria-labelledby="today-weeks">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h2 id="today-weeks" className="text-base">
                    12 tuần gần đây
                  </h2>
                  <Link href="/stats" className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">
                    Xem thống kê
                  </Link>
                </div>
                <Heatmap
                  days={s.days.map((d) => ({ day: d.day, reviews: d.reviews }))}
                  today={s.today}
                  restDays={s.streak.restDays}
                />
              </section>
            </div>
          </>
        )}
      </div>

      <section aria-labelledby="today-contact" className="flex flex-col gap-2 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p id="today-contact" className="text-sm text-fg-muted">
          Gặp lỗi hay có góp ý? Nhắn {CONTACT.nickname}
        </p>
        <ContactLinks compact />
      </section>
    </div>
  );
}
