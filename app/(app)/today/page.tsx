import type { Metadata } from "next";
import Link from "next/link";
import { Check, MessageCircle, PenLine, Play, Plus } from "lucide-react";
import { ContactLinks } from "@/components/contact/contact-links";
import { DeckCard } from "@/components/deck/deck-card";
import { SampleDecksButton } from "@/components/deck/sample-decks-button";
import { CountUp } from "@/components/fx/count-up";
import { Reveal } from "@/components/fx/reveal";
import { Tilt } from "@/components/fx/tilt";
import { LangMark } from "@/components/lang-mark";
import { MascotSay } from "@/components/mascot/mascot-say";
import { PettablePup } from "@/components/mascot/pettable-pup";
import { Pup } from "@/components/mascot/pup";
import { ProgressRing } from "@/components/stats/progress-ring";
import { ActivityCard } from "@/components/today/activity-card";
import { LevelBar } from "@/components/today/level-bar";
import { QuestCard } from "@/components/today/quest-card";
import { QuickAdd, type QuickAddDeck } from "@/components/today/quick-add";
import { TodayCard } from "@/components/today/today-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconTile } from "@/components/ui/icon-tile";
import { CONTACT } from "@/lib/contact";
import { getDeckSamples, getMyDecks } from "@/lib/data/decks";
import { getProgress } from "@/lib/data/progress";
import { getStudySummary } from "@/lib/data/study";
import { placeById } from "@/lib/bin/places";
import { AutoOpenBin, TodayTripAwayCard, TodayTripBackCard } from "@/components/today/today-trip-card";
import { LINES, say, type LineKey, type PupMood } from "@/lib/mascot/lines";
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

export default async function TodayPage({
  searchParams,
}: {
  searchParams?: Promise<{ bin?: string }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const [s, decks, progress] = await Promise.all([getStudySummary(), getMyDecks(), getProgress()]);
  const due = s.langs.reduce((n, l) => n + l.due, 0);
  const fresh = s.langs.reduce((n, l) => n + l.newToday, 0);
  const tomorrow = s.langs.reduce((n, l) => n + l.dueTomorrow, 0);
  const remaining = due + fresh;
  const ownDeck = decks.find((d) => d.relation === "own");
  const addHref = ownDeck ? `/decks/${ownDeck.id}/add` : "/decks/new";
  const ownDecks: QuickAddDeck[] = decks
    .filter((d) => d.relation === "own")
    .map((d) => ({ id: d.id, name: d.name, language: d.language }));
  const firstName = s.me.profile.display_name.split(/\s+/).at(-1);
  const prefs = readPrefs(s.me.settings.prefs);

  const trip = progress.trip;
  const isTripAway = trip.kind === "away";
  const isTripBack = trip.kind === "back";
  const isTripReady = trip.kind === "ready";
  const awayPlaceName = isTripAway ? (placeById(trip.placeId)?.name ?? trip.placeId) : "";
  const awayReturnsAt = isTripAway ? trip.returnsAt : "";

  const [mood, line]: [PupMood, LineKey] = isTripAway
    ? ["sleepy", "tripAway"]
    : s.totalCards === 0
      ? ["wave", "empty"]
      : s.streak.current > 0 && !s.streak.activeToday
        ? ["sleepy", "streakAtRisk"]
        : remaining === 0
          ? ["cheer", "allDone"]
          : remaining >= 50
            ? ["surprised", "dueMany"]
            : ["happy", "due"];
  const seed = new Date(s.today).getUTCDate();
  const text = say(line, {
    seed,
    name: prefs.mascot_name,
    n: line === "streakAtRisk" ? s.streak.current : remaining,
  });
  // The phone bubble takes turns through every line of this situation, starting with today's pick
  const texts = Array.from({ length: LINES[line].length }, (_, i) =>
    say(line, { seed: seed + i, name: prefs.mascot_name, n: line === "streakAtRisk" ? s.streak.current : remaining }),
  );
  if (isTripReady) {
    texts.push(say("tripReady", { seed, name: prefs.mascot_name }));
  }
  const minutes = Math.max(1, Math.ceil((remaining * 20) / 60));
  const activeDays = s.days.filter((d) => d.reviews > 0).map((d) => d.day);
  const topDecks = [...decks]
    .sort(
      (a, b) =>
        Number(b.due_count) - Number(a.due_count) ||
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )
    .slice(0, 4);
  const samples = await getDeckSamples(topDecks.map((d) => d.id));
  const total = s.reviewedToday + remaining;
  const pct = total ? Math.round((s.reviewedToday / total) * 100) : 0;
  const pctToday = s.reviewedToday > 0 ? Math.round((s.correctToday / s.reviewedToday) * 100) : 0;
  const langChips = s.langs.filter((l) => l.due + l.newToday > 0);

  return (
    <Reveal className="flex flex-col gap-6 lg:gap-7">
      {/* Banner Hỗ trợ & Góp ý */}
      <section
        aria-labelledby="today-contact"
        className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-surface p-3.5 shadow-xs transition-colors sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-2.5 dark:border-border"
      >
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-c-blue-soft text-c-blue-fg">
            <MessageCircle className="size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p id="today-contact" className="text-sm font-bold text-fg">
              Gặp lỗi hay có góp ý?
            </p>
            <p className="text-xs text-fg-muted">
              Nhắn trực tiếp cho <span className="font-semibold text-fg">{CONTACT.nickname}</span> qua Facebook hoặc Zalo
            </p>
          </div>
        </div>
        <ContactLinks compact />
      </section>

      <header>
        <p className="text-sm font-medium text-fg-muted">{dateLine(s.today)}</p>
        <h1 data-check-overflow className="mt-0.5 text-[1.6875rem] leading-tight sm:text-[2.125rem]">
          {greeting(s.me.settings.timezone)}, {firstName}!
        </h1>
        <LevelBar
          level={progress.level.level}
          xpInLevel={progress.level.xpInLevel}
          xpForNext={progress.level.xpForNext}
          linked={prefs.mascot}
          name={prefs.mascot_name}
        />
      </header>

      {sp?.bin === "trip" && <AutoOpenBin panel="trip" />}

      {prefs.mascot && isTripBack && <TodayTripBackCard name={prefs.mascot_name} />}

      {s.totalCards === 0 ? (
        <div className="flex flex-col gap-6">
          <EmptyState
            figure={prefs.mascot ? <Pup mood="wave" size={96} className="self-center" /> : "notebook"}
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
          {ownDecks.length > 0 && (
            <div className="max-w-xl">
              <QuickAdd decks={ownDecks} />
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-5 lg:items-stretch">
          {/* Row 1, Col left (8): Hero ôn tập */}
          <div className="col-span-12 flex flex-col lg:col-span-8">
            {remaining > 0 ? (
              <section
                aria-labelledby="today-due"
                className="relative flex h-full flex-col justify-between overflow-hidden rounded-xl bg-primary p-5 text-on-primary shadow-hero sm:flex-row sm:items-center sm:gap-8 sm:p-8"
              >
                <div className="flex items-center gap-4 sm:contents">
                  <ProgressRing
                    value={pct}
                    size={148}
                    stroke={14}
                    trackClassName="text-white/25"
                    barClassName="text-white"
                    className="size-[6.5rem] shrink-0 sm:size-[9.25rem] [&>svg]:size-full"
                  >
                    <span className="flex flex-col items-center leading-none">
                      <span className="font-display text-[1.625rem] sm:text-[2.125rem]">
                        {s.reviewedToday}
                        <span className="text-sm opacity-75 sm:text-lg">/{total}</span>
                      </span>
                      <span className="mt-1 hidden text-[0.8125rem] opacity-85 sm:block">đã ôn</span>
                    </span>
                  </ProgressRing>
                  <div className="sm:hidden">
                    <p className="text-sm font-semibold opacity-85">Ôn tập hôm nay</p>
                    <h2 className="font-display text-[1.4375rem] leading-[1.15]">
                      Còn <CountUp value={remaining} /> từ đang chờ bạn
                    </h2>
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                  <div className="hidden sm:block">
                    <p className="text-[0.9375rem] font-semibold opacity-85">Ôn tập hôm nay</p>
                    <h2 id="today-due" className="font-display text-[1.875rem] leading-[1.15]">
                      Còn <CountUp value={remaining} /> từ đang chờ bạn
                    </h2>
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {langChips.map((l) => (
                      <li key={l.language}>
                        <Link
                          href={`/review?lang=${l.language}`}
                          className="flex min-h-10 items-center gap-2 rounded-full bg-white/16 py-1 pr-3 pl-1 text-[0.8125rem] font-semibold tabular-nums hover:bg-white/24 sm:text-sm"
                        >
                          <LangMark lang={l.language} white label />
                          {l.due} ôn, {l.newToday} mới
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <Button asChild variant="white" size="xl" className="shadow-[0_4px_0_0_var(--primary-press)] active:translate-y-[3px] active:shadow-[0_1px_0_0_var(--primary-press)]">
                      <Link href="/review">
                        <Play className="fill-current" aria-hidden />
                        Bắt đầu ôn
                      </Link>
                    </Button>
                    <span className="text-center text-[0.8125rem] opacity-85 sm:text-sm">khoảng {minutes} phút</span>
                  </div>
                  {prefs.mascot && (
                    <MascotSay
                      mood={mood}
                      name={prefs.mascot_name}
                      text={text}
                      texts={texts}
                      size={56}
                      className={isTripAway ? "mt-2" : "mt-2 lg:hidden"}
                      hidePup={isTripAway}
                      bubbleAction={isTripReady ? "trip" : undefined}
                    />
                  )}
                  {prefs.mascot && isTripAway && (
                    <TodayTripAwayCard
                      name={prefs.mascot_name}
                      placeName={awayPlaceName}
                      returnsAt={awayReturnsAt}
                      timeZone={s.me.settings.timezone}
                    />
                  )}
                </div>
                {prefs.mascot && !isTripAway && (
                  <PettablePup
                    mood="cheer"
                    name={prefs.mascot_name}
                    size={96}
                    pupClassName="xl:size-[7.5rem]"
                    bubble
                    bubbleClassName="right-0 bottom-full mr-0 mb-1"
                    sleepAfterMs={30_000}
                    className="absolute right-5 -bottom-1.5 hidden lg:block"
                  />
                )}
              </section>
            ) : (
              <section
                aria-labelledby="today-done"
                className="relative flex h-full flex-col justify-between overflow-hidden rounded-xl bg-rate-easy p-5 text-white shadow-md sm:flex-row sm:items-center sm:gap-8 sm:p-8"
              >
                <div className="flex items-center gap-4 sm:contents">
                  <ProgressRing
                    value={100}
                    size={148}
                    stroke={14}
                    trackClassName="text-white/25"
                    barClassName="text-white"
                    className="size-[6.5rem] shrink-0 sm:size-[9.25rem] [&>svg]:size-full"
                  >
                    <Check className="size-10 text-white" strokeWidth={3.2} aria-hidden />
                  </ProgressRing>
                  <div className="sm:hidden">
                    <p className="text-sm font-semibold opacity-90">Ôn tập hôm nay</p>
                    <h2 className="font-display text-[1.4375rem] leading-[1.15]">
                      Hôm nay ôn xong rồi
                    </h2>
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                  <div className="hidden sm:block">
                    <p className="text-[0.9375rem] font-semibold opacity-90">Ôn tập hôm nay</p>
                    <h2 id="today-done" className="font-display text-[1.875rem] leading-[1.15]">
                      Hôm nay ôn xong rồi
                    </h2>
                  </div>
                  {s.reviewedToday > 0 && (
                    <p className="text-sm font-medium opacity-90">
                      Bạn đã ôn {s.reviewedToday} lượt, nhớ đúng {pctToday}%.
                    </p>
                  )}
                  <p className="text-sm opacity-90">
                    {tomorrow > 0 ? `Ngày mai có ${tomorrow} từ.` : "Ngày mai chưa có từ nào đến hạn."}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button asChild variant="white" size="xl" className="text-rate-easy-press shadow-[0_4px_0_0_var(--rate-easy-press)] active:translate-y-[3px] active:shadow-[0_1px_0_0_var(--rate-easy-press)]">
                      <Link href="/practice">
                        <PenLine aria-hidden />
                        Luyện thêm
                      </Link>
                    </Button>
                    <Link href={addHref} className="min-h-11 content-center text-sm font-semibold underline-offset-4 hover:underline">
                      Học từ mới
                    </Link>
                  </div>
                  {prefs.mascot && (
                    <MascotSay
                      mood={mood}
                      name={prefs.mascot_name}
                      text={text}
                      texts={texts}
                      size={56}
                      className={isTripAway ? "mt-2" : "mt-2 lg:hidden"}
                      hidePup={isTripAway}
                      bubbleAction={isTripReady ? "trip" : undefined}
                    />
                  )}
                  {prefs.mascot && isTripAway && (
                    <TodayTripAwayCard
                      name={prefs.mascot_name}
                      placeName={awayPlaceName}
                      returnsAt={awayReturnsAt}
                      timeZone={s.me.settings.timezone}
                    />
                  )}
                </div>
                {prefs.mascot && !isTripAway && (
                  <PettablePup
                    mood="cheer"
                    name={prefs.mascot_name}
                    size={96}
                    pupClassName="xl:size-[7.5rem]"
                    bubble
                    bubbleClassName="right-0 bottom-full mr-0 mb-1"
                    sleepAfterMs={30_000}
                    className="absolute right-5 -bottom-1.5 hidden lg:block"
                  />
                )}
              </section>
            )}
          </div>

          {/* Row 1, Col right (4): Thẻ Hôm nay */}
          <div className="col-span-12 flex flex-col lg:col-span-4">
            <TodayCard
              streak={s.streak}
              today={s.today}
              activeDays={activeDays}
              reviewedToday={s.reviewedToday}
              correctToday={s.correctToday}
              xpToday={s.xpToday}
            />
          </div>

          {/* Row 2, Col left (8): Thêm từ nhanh */}
          <div className="col-span-12 flex flex-col md:col-span-6 lg:col-span-8">
            <QuickAdd decks={ownDecks} />
          </div>

          {/* Row 2, Col right (4): Nhiệm vụ */}
          <div className="col-span-12 flex flex-col md:col-span-6 lg:col-span-4">
            <QuestCard compact quests={progress.quests} bones={progress.bones} />
          </div>

          {/* Row 3: Bộ từ đang học (12 cols) */}
          {decks.length > 0 && (
            <section aria-labelledby="today-decks" className="col-span-12 flex flex-col gap-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="today-decks" className="text-lg sm:text-xl">
                  Bộ từ đang học
                </h2>
                <Link href="/decks" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary-fg hover:underline">
                  Tất cả
                </Link>
              </div>
              <ul className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 xl:grid-cols-4">
                {topDecks.map((d) => (
                  <li key={d.id} className="w-[12.5rem] shrink-0 snap-start md:w-auto">
                    <Tilt>
                      <DeckCard d={d} sample={samples[d.id]} compact quickReview />
                    </Tilt>
                  </li>
                ))}
                {topDecks.length < 4 && (
                  <li className="hidden h-full xl:flex">
                    <Card interactive className="h-full w-full border-2 border-dashed border-border-strong bg-transparent">
                      <Link href="/decks/new" aria-label="Thêm bộ từ" className="flex h-full flex-col items-center justify-center gap-2 p-5 text-center">
                        <IconTile icon={Plus} tone="mint" size={40} solid />
                        <span className="font-bold text-fg">Tạo bộ từ mới</span>
                        <span className="text-xs text-fg-muted">hoặc thêm bộ từ mẫu</span>
                      </Link>
                    </Card>
                  </li>
                )}
              </ul>
            </section>
          )}

          {/* Row 4: Hoạt động (8 cols) + 30 ngày qua (4 cols) */}
          <ActivityCard
            days={s.days}
            today={s.today}
            restDays={s.streak.restDays}
            streakCurrent={s.streak.current}
          />
        </div>
      )}
    </Reveal>
  );
}
