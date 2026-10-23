"use client";

import {
  Brush,
  Check,
  ClipboardCheck,
  GraduationCap,
  Headphones,
  Keyboard,
  Layers,
  ListChecks,
  Music,
  Puzzle,
  Shuffle,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { LANGUAGES, type PracticeMode } from "@/lib/lang/registry";
import type { LangCode } from "@/lib/lang/types";
import { countsFor, MODE_INFO } from "@/lib/practice/questions";
import { cn } from "@/lib/utils";

type DeckOption = { id: string; name: string; language: LangCode; wordCount: number };

// Icon + candy color per mode (tile text/wash, and the border when selected).
const MODE_LOOK: Record<PracticeMode, { icon: LucideIcon; tile: string; ring: string }> = {
  learn: { icon: GraduationCap, tile: "bg-wash-jade text-jade-text", ring: "border-jade" },
  test: { icon: ClipboardCheck, tile: "bg-wash-blue text-ink-blue", ring: "border-ink-blue" },
  match: { icon: Shuffle, tile: "bg-wash-yellow text-sun-text", ring: "border-sun" },
  flashcard: { icon: Layers, tile: "bg-wash-red text-danger", ring: "border-margin-red" },
  quiz: { icon: ListChecks, tile: "bg-wash-grape text-grape-text", ring: "border-grape" },
  typing: { icon: Keyboard, tile: "bg-wash-sky text-sky-text", ring: "border-sky" },
  listening: { icon: Headphones, tile: "bg-wash-pink text-pink-text", ring: "border-pink" },
  cloze: { icon: Puzzle, tile: "bg-wash-yellow text-sun-text", ring: "border-sun" },
  writing: { icon: Brush, tile: "bg-wash-jade text-jade-text", ring: "border-jade" },
  tones: { icon: Music, tile: "bg-wash-blue text-ink-blue", ring: "border-ink-blue" },
};

const SOURCES = [
  { value: "all", label: "Tất cả" },
  { value: "due", label: "Đến hạn" },
  { value: "hard", label: "Hay quên nhất" },
  { value: "recent", label: "Mới thêm" },
] as const;

function Chips<T extends string | number>({
  name,
  legend,
  value,
  onChange,
  options,
}: {
  name: string;
  legend: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <fieldset>
      <legend className="mb-2 font-heading text-base font-extrabold text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={String(o.value)}
            className={cn(
              "inline-flex min-h-11 cursor-pointer items-center rounded-full border-2 px-4 text-sm font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-ink-blue",
              value === o.value
                ? "border-ink-blue bg-ink-blue text-primary-foreground"
                : "border-rule bg-surface text-ink-soft hover:text-ink",
            )}
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

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
  const [mode, setMode] = useState<PracticeMode>("quiz");
  const [count, setCount] = useState(10);
  const [source, setSource] = useState<(typeof SOURCES)[number]["value"]>("all");
  const [countsToSrs, setCountsToSrs] = useState(false);
  const activeMode = modes.includes(mode) ? mode : "quiz";
  const counts = countsFor(activeMode);
  const activeCount = counts.includes(count) ? count : counts[0];

  function start(e: React.FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams({ n: String(activeCount), source });
    if (scope.startsWith("lang:")) q.set("lang", language);
    else q.set("deck", scope);
    if (countsToSrs) q.set("srs", "1");
    router.push(`/practice/${activeMode}?${q}`);
  }

  return (
    <form onSubmit={start} className="flex flex-col gap-6">
      <fieldset>
        <legend className="mb-2 font-heading text-base font-extrabold text-ink">Chế độ</legend>
        <div className="grid grid-cols-2 gap-3">
          {modes.map((m) => {
            const look = MODE_LOOK[m];
            const Icon = look.icon;
            const selected = activeMode === m;
            return (
              <label
                key={m}
                className={cn(
                  "relative flex min-h-32 cursor-pointer flex-col gap-2 rounded-card border-2 bg-surface p-3.5 shadow-card transition-transform has-focus-visible:outline-2 has-focus-visible:outline-ink-blue",
                  selected
                    ? cn(look.ring, "-translate-y-0.5")
                    : "border-transparent hover:-translate-y-0.5",
                )}
              >
                <input
                  type="radio"
                  name="mode"
                  className="sr-only"
                  checked={activeMode === m}
                  onChange={() => setMode(m)}
                />
                <span className={cn("icon-tile size-11", look.tile)}>
                  <Icon className="size-6" aria-hidden />
                </span>
                {selected && (
                  <span className="absolute top-3 right-3 grid size-6 animate-pop-in place-items-center rounded-full bg-ink-blue text-primary-foreground">
                    <Check className="size-4" strokeWidth={3} aria-hidden />
                  </span>
                )}
                <span className="font-bold text-ink">{MODE_INFO[m].label}</span>
                <span className="text-sm leading-snug text-ink-soft">{MODE_INFO[m].hint}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="font-heading text-base font-extrabold text-ink">Bộ từ</span>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="h-12 rounded-btn border-2 border-rule bg-surface px-3 font-medium text-ink"
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
      </label>

      <Chips
        name="count"
        legend={activeMode === "flashcard" ? "Số thẻ" : "Số câu"}
        value={activeCount}
        onChange={setCount}
        options={counts.map((n) => ({
          value: n,
          label: n === 200 ? "Cả bộ" : activeMode === "flashcard" ? `${n} thẻ` : `${n} câu`,
        }))}
      />
      <Chips
        name="source"
        legend="Nguồn từ"
        value={source}
        onChange={setSource}
        options={[...SOURCES]}
      />

      <label className="flex min-h-12 items-center justify-between gap-4 rounded-card border border-rule bg-surface px-4 py-3 shadow-card">
        <span>
          <span className="block font-medium text-ink">Tính vào ôn tập</span>
          <span className="block text-sm text-ink-soft">
            Kết quả luyện tập sẽ thay đổi lịch ôn của từ.
          </span>
        </span>
        <Switch
          checked={countsToSrs}
          onCheckedChange={setCountsToSrs}
          aria-label="Tính vào ôn tập"
        />
      </label>

      <button
        type="submit"
        className="btn-3d min-h-14 rounded-btn bg-primary text-lg font-extrabold text-primary-foreground [--edge-color:var(--ink-blue-shade)]"
      >
        Bắt đầu luyện 🚀
      </button>
    </form>
  );
}
