"use client";

import { Check, ChevronDown, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LangMark } from "@/components/lang-mark";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { ChipChoice, SegmentedRadio } from "@/components/ui/segmented-radio";
import { Switch } from "@/components/ui/switch";
import { LANGUAGES, type PracticeMode } from "@/lib/lang/registry";
import type { LangCode } from "@/lib/lang/types";
import { formatMs } from "@/lib/practice/match";
import { countsFor, MODE_INFO } from "@/lib/practice/questions";
import { suggestMode, type ModeStats } from "@/lib/practice/suggest";
import { DEFAULT_TEST_TYPES, TEST_TYPE_LABEL, TEST_TYPES, type TestAsk, type TestType } from "@/lib/practice/test";
import { TONE_CLASSES } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { ModeArt } from "./mode-art";
import { MODE_LOOK } from "./mode-look";
import { useModeStats } from "./use-mode-stats";

type DeckOption = { id: string; name: string; language: LangCode; wordCount: number };

const SOURCES = [
  { value: "all", label: "Tất cả" },
  { value: "due", label: "Đến hạn" },
  { value: "hard", label: "Hay quên nhất" },
  { value: "recent", label: "Mới thêm" },
] as const;

// How the set size reads per mode (questions by default).
const COUNT_UNIT: Partial<Record<PracticeMode, { legend: string; unit: string }>> = {
  flashcard: { legend: "Số thẻ", unit: "thẻ" },
  match: { legend: "Số cặp", unit: "cặp" },
  learn: { legend: "Số từ", unit: "từ" },
};

/** The line a game card shows about how this deck went, from what the device remembers. */
function statLine(mode: PracticeMode, s: ModeStats): string | null {
  if (mode === "learn" && s.learnPercent !== null) return `Đã thuộc ${s.learnPercent}%`;
  if (mode === "test" && s.testPercent !== null) return `Lần trước ${s.testPercent}%`;
  if (mode === "match" && s.matchMs !== null) return `Kỷ lục ${formatMs(s.matchMs)}`;
  return null;
}

// Ways to study the whole deck come first; the rest train one skill at a time.
const STUDY_GAMES: PracticeMode[] = ["learn", "test", "match", "flashcard"];

const ASKS: { value: TestAsk; label: string }[] = [
  { value: "both", label: "Trộn" },
  { value: "term", label: "Từ" },
  { value: "meaning", label: "Nghĩa" },
];

export function PracticeSetup({
  decks,
  studyLangs,
  initialDeck,
}: {
  decks: DeckOption[];
  studyLangs: LangCode[];
  initialDeck?: string;
}) {
  const router = useRouter();
  const langs = studyLangs.length ? studyLangs : (["en"] as LangCode[]);
  const [scope, setScope] = useState<string>(
    initialDeck && decks.some((d) => d.id === initialDeck) ? initialDeck : `lang:${langs[0]}`,
  );
  const language: LangCode = scope.startsWith("lang:")
    ? (scope.slice(5) as LangCode)
    : (decks.find((d) => d.id === scope)?.language ?? langs[0]);
  const modes = LANGUAGES[language].practiceModes;
  const [mode, setMode] = useState<PracticeMode>("learn");
  const [count, setCount] = useState(10);
  const [source, setSource] = useState<(typeof SOURCES)[number]["value"]>("all");
  const [countsToSrs, setCountsToSrs] = useState(false);
  const [testTypes, setTestTypes] = useState<TestType[]>(DEFAULT_TEST_TYPES);
  const [ask, setAsk] = useState<TestAsk>("both");
  const activeMode = modes.includes(mode) ? mode : "learn";
  const counts = countsFor(activeMode);
  const activeCount = counts.includes(count) ? count : counts[0];
  const scopeName = scope.startsWith("lang:") ? `Mọi bộ ${LANGUAGES[language].label.toLowerCase()}` : (decks.find((d) => d.id === scope)?.name ?? "");
  const scopeWords = decks.find((d) => d.id === scope)?.wordCount;
  // The Match record is kept per number of pairs; the card shows the one for the size that would be played
  const matchPairs = Math.min(activeMode === "match" ? activeCount : countsFor("match")[0], scopeWords ?? Infinity);
  const stats = useModeStats(scope, matchPairs);
  const suggested = suggestMode(stats);

  function start(e: React.FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams({ n: String(activeCount), source });
    if (scope.startsWith("lang:")) q.set("lang", language);
    else q.set("deck", scope);
    if (countsToSrs) q.set("srs", "1");
    if (activeMode === "test") {
      q.set("types", TEST_TYPES.filter((t) => testTypes.includes(t)).join(","));
      q.set("ask", ask);
    }
    router.push(`/practice/${activeMode}?${q}`);
  }

  // A mode is a radio card in its own hue (REDESIGN_V2 §6.8). The four ways to study a deck show a picture,
  // what this device knows about the deck and, for one of them, "Gợi ý cho bạn"; the skills are smaller cards
  // with their one line. The chosen card turns pale in its hue with a 2px ring and a check.
  function modeCard(m: PracticeMode, big: boolean) {
    const zhOnly = !LANGUAGES.en.practiceModes.includes(m);
    const { icon, tone } = MODE_LOOK[m];
    const t = TONE_CLASSES[tone];
    const line = big ? statLine(m, stats) : null;
    return (
      <label
        key={m}
        className={cn(
          "group/mode relative flex cursor-pointer rounded-lg border-2 border-transparent bg-surface shadow-sm transition-[border-color,transform] hover:border-border-strong has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary dark:border-border",
          t.picked,
          big ? "flex-col gap-2.5 p-3 pb-3.5 has-checked:-translate-y-0.5" : "min-h-[4.5rem] items-center gap-3 p-3",
        )}
      >
        <input type="radio" name="mode" className="sr-only" checked={activeMode === m} onChange={() => setMode(m)} />
        {big ? (
          <span className={cn("relative block overflow-hidden rounded-md px-3 py-2", t.soft)}>
            <ModeArt mode={m} className="mx-auto max-h-16" />
          </span>
        ) : (
          <IconTile icon={icon} tone={tone} size={44} solid />
        )}
        {zhOnly && <LangMark lang="zh" className={cn("absolute", big ? "top-5 right-5" : "top-2 right-2")} />}
        {big && (
          <span className={cn("absolute top-5 right-5 hidden size-6 place-items-center rounded-full text-white group-has-checked/mode:grid", t.solid)}>
            <Check className="size-3.5" strokeWidth={3.4} aria-hidden />
          </span>
        )}
        <span className="flex min-w-0 flex-col gap-0.5">
          {big && suggested === m && (
            <span className="mb-0.5 inline-flex w-fit items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[0.8125rem] font-extrabold text-primary-fg">
              <Sparkles className="size-3" strokeWidth={2.4} aria-hidden />
              Gợi ý cho bạn
            </span>
          )}
          <span data-check-overflow className="font-bold text-fg">{MODE_INFO[m].label}</span>
          <span data-hint className="text-[0.8125rem] leading-snug text-fg-muted">
            {MODE_INFO[m].hint}
          </span>
          {line && <span data-check-overflow className={cn("mt-1 w-fit rounded-full px-2 py-0.5 text-xs font-extrabold tabular-nums", t.soft, t.fg)}>{line}</span>}
        </span>
      </label>
    );
  }

  return (
    <form onSubmit={start} className="flex flex-col gap-8">
      <fieldset>
        <legend className="sr-only">Chế độ</legend>
        <p className="mb-2.5 text-[0.9375rem] font-bold text-fg-muted">Học bộ từ</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {modes.filter((m) => STUDY_GAMES.includes(m)).map((m) => modeCard(m, true))}
        </div>
        <p className="mt-6 mb-2.5 text-[0.9375rem] font-bold text-fg-muted">Luyện riêng từng kỹ năng</p>
        <div className="grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          {modes.filter((m) => !STUDY_GAMES.includes(m)).map((m) => modeCard(m, false))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-6 rounded-lg border border-border/60 bg-surface p-4 shadow-sm sm:p-5 dark:border-border">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-fg">Bộ từ</span>
          <span className="relative">
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="h-12 w-full appearance-none rounded-md border border-transparent bg-surface-2 pr-10 pl-4 text-fg outline-none hover:border-border-strong focus-visible:border-primary focus-visible:bg-surface focus-visible:ring-4 focus-visible:ring-primary/15"
            >
              {langs.map((l) => (
                <option key={l} value={`lang:${l}`}>
                  Mọi bộ {LANGUAGES[l].label.toLowerCase()}
                </option>
              ))}
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.wordCount})
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-muted" />
          </span>
        </label>

        <SegmentedRadio
          name="count"
          legend={COUNT_UNIT[activeMode]?.legend ?? "Số câu"}
          value={activeCount}
          onChange={setCount}
          options={counts.map((n) => ({
            value: n,
            label: n === 200 ? "Cả bộ" : `${n} ${COUNT_UNIT[activeMode]?.unit ?? "câu"}`,
          }))}
        />
        {activeMode === "test" && (
          <>
            <ChipChoice
              legend="Dạng câu"
              value={testTypes}
              onChange={setTestTypes}
              options={TEST_TYPES.map((t) => ({ value: t, label: TEST_TYPE_LABEL[t] }))}
            />
            <SegmentedRadio name="ask" legend="Hỏi bằng" value={ask} onChange={setAsk} options={ASKS} />
          </>
        )}
        <SegmentedRadio name="source" legend="Nguồn từ" value={source} onChange={setSource} options={[...SOURCES]} />

        {/* Match logs no reviews, so it has nothing to count. */}
        {activeMode !== "match" && (
          <label className="flex min-h-14 items-center justify-between gap-4">
            <span>
              <span className="block font-semibold text-fg">Tính vào ôn tập</span>
              <span className="block text-sm text-fg-muted">Kết quả luyện tập sẽ thay đổi lịch ôn của từ.</span>
            </span>
            <Switch checked={countsToSrs} onCheckedChange={setCountsToSrs} aria-label="Tính vào ôn tập" />
          </label>
        )}
      </div>

      {/* Stays in view, above the phone's bottom bar */}
      <div className="sticky bottom-24 z-10 -mx-1 rounded-xl bg-canvas/90 p-1 backdrop-blur-sm lg:bottom-4">
        <p aria-live="polite" className="mb-2 truncate px-1 text-center text-sm font-semibold text-fg-muted">
          {MODE_INFO[activeMode].label} · {scopeName} · {activeCount} {COUNT_UNIT[activeMode]?.unit ?? "câu"}
        </p>
        <Button type="submit" variant="pressable" size="xl" className="w-full">
          Bắt đầu luyện
        </Button>
      </div>
    </form>
  );
}
