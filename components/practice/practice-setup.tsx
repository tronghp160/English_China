"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { LANGUAGES, type PracticeMode } from "@/lib/lang/registry";
import type { LangCode } from "@/lib/lang/types";
import { countsFor, MODE_INFO } from "@/lib/practice/questions";
import {
  DEFAULT_TEST_TYPES,
  TEST_TYPE_LABEL,
  TEST_TYPES,
  type TestAsk,
  type TestType,
} from "@/lib/practice/test";
import { MODE_LOOK } from "./mode-look";
import { cn } from "@/lib/utils";

type DeckOption = { id: string; name: string; language: LangCode; wordCount: number };

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

// How the set size reads per mode (questions by default).
const COUNT_UNIT: Partial<Record<PracticeMode, { legend: string; unit: string }>> = {
  flashcard: { legend: "Số thẻ", unit: "thẻ" },
  match: { legend: "Số cặp", unit: "cặp" },
  learn: { legend: "Số từ", unit: "từ" },
};

const ASKS: { value: TestAsk; label: string }[] = [
  { value: "both", label: "Trộn" },
  { value: "term", label: "Từ" },
  { value: "meaning", label: "Nghĩa" },
];

/** Multi-select chips (at least one stays on). */
function CheckChips<T extends string>({
  legend,
  value,
  onChange,
  options,
}: {
  legend: string;
  value: T[];
  onChange: (v: T[]) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <fieldset>
      <legend className="mb-2 font-heading text-base font-extrabold text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o.value);
          const last = on && value.length === 1;
          return (
            <label
              key={o.value}
              className={cn(
                "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-2 px-4 text-sm font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-ink-blue",
                on
                  ? "border-ink-blue bg-ink-blue text-primary-foreground"
                  : "border-rule bg-surface text-ink-soft hover:text-ink",
                last && "cursor-default",
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                disabled={last}
                onChange={() =>
                  onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])
                }
              />
              {on && <Check className="size-4" strokeWidth={3} aria-hidden />}
              {o.label}
            </label>
          );
        })}
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
  const [testTypes, setTestTypes] = useState<TestType[]>(DEFAULT_TEST_TYPES);
  const [ask, setAsk] = useState<TestAsk>("both");
  const activeMode = modes.includes(mode) ? mode : "quiz";
  const counts = countsFor(activeMode);
  const activeCount = counts.includes(count) ? count : counts[0];

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
          <CheckChips
            legend="Dạng câu"
            value={testTypes}
            onChange={setTestTypes}
            options={TEST_TYPES.map((t) => ({ value: t, label: TEST_TYPE_LABEL[t] }))}
          />
          <Chips name="ask" legend="Hỏi bằng" value={ask} onChange={setAsk} options={ASKS} />
        </>
      )}
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
