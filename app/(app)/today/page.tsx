import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Flame,
  PenLine,
  Play,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { ContactLinks } from "@/components/contact/contact-links";
import { CONTACT } from "@/lib/contact";
import { DeckCover } from "@/components/deck/deck-cover";
import { SampleDecksButton } from "@/components/deck/sample-decks-button";
import { LangFlag } from "@/components/lang-flag";
import { MascotSay } from "@/components/mascot/mascot-say";
import { Heatmap } from "@/components/stats/heatmap";
import { buttonVariants } from "@/components/ui/button";
import { getMyDecks } from "@/lib/data/decks";
import { getStudySummary } from "@/lib/data/study";
import { LANGUAGES } from "@/lib/lang/registry";
import { say, type LineKey, type PupMood } from "@/lib/mascot/lines";
import { cn } from "@/lib/utils";
import { readPrefs } from "@/lib/validation";

export const metadata: Metadata = { title: "Hôm nay" };

const CHEERS = [
  "Mỗi ngày một chút, chẳng mấy mà thành thạo.",
  "Não bạn đang chờ được tập thể dục đây!",
  "Ôn đúng lúc là nhớ lâu gấp đôi.",
  "Chỉ 10 phút thôi, bắt đầu nào!",
  "Từ vựng hôm nay là vốn liếng ngày mai.",
];

function greeting(timeZone: string) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone }).format(
      new Date(),
    ),
  );
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

type Tone = "sun" | "jade" | "sky" | "grape";
const TILE: Record<Tone, string> = {
  sun: "bg-wash-yellow text-sun-text",
  jade: "bg-wash-jade text-jade-text",
  sky: "bg-wash-sky text-sky-text",
  grape: "bg-wash-grape text-grape-text",
};

function QuickAction({
  href,
  icon: Icon,
  tone,
  children,
}: {
  href: string;
  icon: LucideIcon;
  tone: Tone;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="btn-3d flex min-h-24 flex-col items-center justify-center gap-2 rounded-card border-2 border-rule bg-surface px-2 py-3 text-center text-sm font-semibold text-ink [--edge-color:var(--rule)] hover:bg-muted"
    >
      <span className={cn("icon-tile size-10", TILE[tone])}>
        <Icon className="size-5" aria-hidden />
      </span>
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
  const split = s.langs.filter((l) => l.due + l.newToday > 0).length > 1;
  const cheer = CHEERS[new Date(s.today).getUTCDate() % CHEERS.length];
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

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="font-heading text-xl leading-tight font-black text-ink">
          {greeting(s.me.settings.timezone)}, {firstName}! <span aria-hidden>👋</span>
        </p>
        {prefs.mascot ? (
          <MascotSay
            mood={mood}
            name={prefs.mascot_name}
            text={say(line, {
              seed: new Date(s.today).getUTCDate(),
              name: prefs.mascot_name,
              n: line === "streakAtRisk" ? s.streak.current : due + fresh,
            })}
            className="mt-2"
          />
        ) : (
          <p className="mt-0.5 text-ink-soft">{cheer}</p>
        )}
      </header>

      {/* Phones: one column. Laptops: main column + a right column (streak, goal, decks). */}
      <div
        className={cn(
          "flex flex-col gap-5",
          s.totalCards > 0 &&
            "lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:grid-rows-[auto_auto_1fr] lg:items-start lg:gap-6",
        )}
      >
        <div className="lg:col-start-1 lg:row-start-1">
          {s.totalCards === 0 ? (
            <section className="hero-gradient relative overflow-hidden rounded-sheet px-6 py-8 shadow-pop">
              <span aria-hidden className="absolute -top-2 right-4 animate-float text-6xl">
                📚
              </span>
              <h1 className="max-w-[16rem] text-2xl leading-tight">
                Cuốn sổ của bạn còn trống trơn!
              </h1>
              <p className="mt-2 max-w-md text-white/85">
                Thêm vài bộ từ mẫu để thử ngay, hoặc tự tạo bộ từ đầu tiên của bạn.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <SampleDecksButton className="border-0 bg-white text-brand [--edge-color:rgb(0_0_0/0.18)] hover:bg-white/90" />
                <Link
                  href={addHref}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-btn bg-white/15 px-5 font-semibold text-white ring-1 ring-white/40 hover:bg-white/25"
                >
                  <Plus className="size-5" aria-hidden />
                  {ownDeck ? "Thêm từ đầu tiên" : "Tạo bộ từ của tôi"}
                </Link>
              </div>
            </section>
          ) : due + fresh === 0 ? (
            <section className="relative overflow-hidden rounded-sheet bg-wash-jade px-6 py-8">
              <span aria-hidden className="absolute top-4 right-5 animate-float text-6xl">
                🎉
              </span>
              <h1 className="max-w-[15rem] text-2xl leading-tight text-ink">
                <span className="highlighter">Xong bài hôm nay rồi!</span>
              </h1>
              <p className="mt-2 text-ink-soft">
                {tomorrow > 0
                  ? `Ngày mai có ${tomorrow} từ cần ôn. Hẹn gặp lại nhé!`
                  : "Ngày mai chưa có từ nào đến hạn."}
              </p>
              <Link
                href="/practice"
                className={cn(buttonVariants(), "mt-5 h-12 gap-2 px-5 text-base")}
              >
                <PenLine className="size-5" aria-hidden />
                Luyện tập thêm
              </Link>
            </section>
          ) : (
            <section
              className="hero-gradient relative overflow-hidden rounded-sheet px-6 pt-7 pb-6 shadow-pop"
              aria-labelledby="today-due"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -right-10 -bottom-12 size-44 rounded-full bg-white/10"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute top-6 -right-6 size-20 rounded-full bg-highlight/30"
              />
              <span aria-hidden className="absolute top-5 right-5 animate-float text-5xl">
                🧠
              </span>
              <h1 id="today-due" className="flex items-baseline gap-3">
                <span className="animate-pop-in font-heading text-7xl leading-none font-black tabular-nums">
                  {due}
                </span>
                <span className="text-xl font-extrabold">từ cần ôn</span>
              </h1>
              <p className="mt-2 text-white/85">
                {fresh > 0 ? `và ${fresh} từ mới đang chờ bạn làm quen` : "Không có từ mới hôm nay"}
              </p>

              {split && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {s.langs.map((l) => (
                    <li key={l.language}>
                      <Link
                        href={`/review?lang=${l.language}`}
                        className="flex min-h-11 items-center gap-2 rounded-full bg-white/15 py-1 pr-4 pl-2 text-sm font-medium ring-1 ring-white/25 hover:bg-white/25"
                      >
                        <LangFlag lang={l.language} className="text-lg" />
                        <span>{LANGUAGES[l.language].label}</span>
                        <span className="text-white/80 tabular-nums">
                          {l.due} ôn · {l.newToday} mới
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <Link
                href="/review"
                className="btn-3d mt-6 flex min-h-14 items-center justify-center gap-2 rounded-btn bg-white text-lg font-extrabold text-brand [--edge-color:rgb(0_0_0/0.2)] hover:bg-white/95"
              >
                <Play className="size-5 fill-current" aria-hidden />
                Bắt đầu ôn
                <ArrowRight className="size-5" aria-hidden />
              </Link>
            </section>
          )}
        </div>

        {s.totalCards > 0 && (
          <>
            <nav
              aria-label="Lối tắt"
              className="grid grid-cols-3 gap-3 lg:col-start-1 lg:row-start-2"
            >
              <QuickAction href={addHref} icon={Plus} tone="sun">
                Thêm từ
              </QuickAction>
              <QuickAction href="/practice" icon={PenLine} tone="jade">
                Luyện tập
              </QuickAction>
              <QuickAction href="/explore" icon={Compass} tone="sky">
                Khám phá
              </QuickAction>
            </nav>

            <aside className="flex flex-col gap-3 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:gap-5">
                <section className="relative overflow-hidden rounded-card bg-linear-to-br from-wash-yellow to-wash-red p-4">
                  <h2 className="text-sm text-sun-text">Chuỗi ngày</h2>
                  <p className="mt-1 flex items-center gap-1.5">
                    <Flame
                      className={cn(
                        "size-8",
                        s.streak.current ? "fill-sun text-margin-red" : "text-ink-soft",
                        s.streak.current > 0 && !s.streak.activeToday && "animate-wiggle",
                      )}
                      aria-hidden
                    />
                    <span className="font-heading text-4xl font-black text-ink tabular-nums">
                      {s.streak.current}
                    </span>
                    <span className="font-semibold text-ink">ngày</span>
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {!s.streak.activeToday && s.streak.current > 0
                      ? "Ôn 1 thẻ hôm nay để giữ lửa!"
                      : s.streak.restUsedThisWeek
                        ? "Đã dùng ngày nghỉ của tuần."
                        : "Còn 1 ngày nghỉ miễn phí tuần này."}
                  </p>
                </section>

              {decks.length > 0 && (
                <section className="hidden rounded-card border border-rule bg-surface p-4 shadow-card lg:block">
                  <div className="mb-2 flex items-baseline justify-between">
                    <h2 className="text-base text-ink">Bộ từ của bạn</h2>
                    <Link
                      href="/decks"
                      className="inline-flex min-h-11 items-center text-sm font-semibold text-ink-blue hover:underline"
                    >
                      Tất cả
                    </Link>
                  </div>
                  <ul className="flex flex-col gap-1">
                    {[...decks]
                      .sort((a, b) => Number(b.due_count) - Number(a.due_count))
                      .slice(0, 5)
                      .map((d) => (
                        <li key={d.id}>
                          <Link
                            href={`/decks/${d.id}`}
                            className="-mx-2 flex items-center gap-3 rounded-btn px-2 py-2 hover:bg-muted"
                          >
                            <DeckCover
                              id={d.id}
                              language={d.language}
                              small
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-bold text-ink">
                                {d.name}
                              </span>
                              <span className="block text-xs text-ink-soft">{d.word_count} từ</span>
                            </span>
                            {d.due_count > 0 && (
                              <span className="shrink-0 rounded-full bg-wash-red px-2 py-0.5 text-xs font-bold text-danger tabular-nums">
                                {d.due_count} ôn
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                  </ul>
                </section>
              )}
            </aside>

            <section className="rounded-card border border-rule bg-surface p-4 shadow-card lg:col-start-1 lg:row-start-3">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-base text-ink">12 tuần gần đây</h2>
                <Link
                  href="/stats"
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-ink-blue hover:underline"
                >
                  Xem thống kê
                </Link>
              </div>
              <Heatmap
                days={s.days.map((d) => ({ day: d.day, reviews: d.reviews }))}
                today={s.today}
                restDays={s.streak.restDays}
              />
            </section>
          </>
        )}
      </div>

      {s.totalCards === 0 && (
        <p className="text-center text-sm text-ink-soft">
          Mẹo: trong một bộ từ, bấm <span className="font-semibold text-ink">Thêm từ</span> rồi gõ
          một từ — AI sẽ điền nghĩa, phiên âm và câu ví dụ giúp bạn.
        </p>
      )}

      <section
        aria-labelledby="today-contact"
        className="flex flex-col gap-3 rounded-card border border-dashed border-rule px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 id="today-contact" className="text-base text-ink">
            Liên hệ với {CONTACT.nickname} 👋
          </h2>
          <p className="text-sm text-ink-soft">Gặp lỗi, có góp ý hay muốn học cùng? Nhắn mình nhé.</p>
        </div>
        <ContactLinks compact />
      </section>
    </div>
  );
}
