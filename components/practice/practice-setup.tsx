"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { LANGUAGES, type PracticeMode } from "@/lib/lang/registry";
import type { LangCode } from "@/lib/lang/types";
import { MODE_INFO } from "@/lib/practice/questions";
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
      <legend className="mb-2 text-sm font-medium text-ink-soft">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={String(o.value)}
            className={cn(
              "inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm has-focus-visible:outline-2 has-focus-visible:outline-ink-blue",
              value === o.value
                ? "border-ink-blue bg-wash-blue font-medium text-ink"
                : "border-rule bg-surface text-ink-soft",
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

  function start(e: React.FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams({ n: String(count), source });
    if (scope.startsWith("lang:")) q.set("lang", language);
    else q.set("deck", scope);
    if (countsToSrs) q.set("srs", "1");
    router.push(`/practice/${activeMode}?${q}`);
  }

  return (
    <form onSubmit={start} className="flex flex-col gap-6">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink-soft">Chế độ</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {modes.map((m) => (
            <label
              key={m}
              className={cn(
                "flex min-h-16 cursor-pointer flex-col justify-center rounded-[12px] border px-4 py-3 has-focus-visible:outline-2 has-focus-visible:outline-ink-blue",
                activeMode === m
                  ? "border-ink-blue bg-wash-blue"
                  : "border-rule bg-surface hover:bg-muted",
              )}
            >
              <input
                type="radio"
                name="mode"
                className="sr-only"
                checked={activeMode === m}
                onChange={() => setMode(m)}
              />
              <span className="font-medium text-ink">{MODE_INFO[m].label}</span>
              <span className="text-sm text-ink-soft">{MODE_INFO[m].hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink-soft">Bộ từ</span>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="h-12 rounded-[10px] border border-rule bg-surface px-3 text-ink"
        >
          {langs.map((l) => (
            <option key={l} value={`lang:${l}`}>
              {LANGUAGES[l].flag} Mọi bộ {LANGUAGES[l].label.toLowerCase()}
            </option>
          ))}
          {decks.map((d) => (
            <option key={d.id} value={d.id}>
              {LANGUAGES[d.language].flag} {d.name} ({d.wordCount})
            </option>
          ))}
        </select>
      </label>

      <Chips
        name="count"
        legend="Số câu"
        value={count}
        onChange={setCount}
        options={[10, 20, 30].map((n) => ({ value: n, label: `${n} câu` }))}
      />
      <Chips
        name="source"
        legend="Nguồn từ"
        value={source}
        onChange={setSource}
        options={[...SOURCES]}
      />

      <label className="flex min-h-12 items-center justify-between gap-4 rounded-[12px] border border-rule bg-surface px-4 py-3">
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
        className="min-h-14 rounded-[10px] bg-primary text-lg font-medium text-primary-foreground"
      >
        Bắt đầu luyện
      </button>
    </form>
  );
}
