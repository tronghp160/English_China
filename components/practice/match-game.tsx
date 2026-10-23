"use client";

import { Shuffle, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMe } from "@/components/app-shell/me-provider";
import { EndPup } from "@/components/mascot/end-pup";
import { Confetti } from "@/components/review/confetti";
import { formatMs, isPair, MATCH_PENALTY_MS, type MatchTile } from "@/lib/practice/match";
import { getMatchRecord, saveMatchTime, type MatchRecord } from "@/lib/practice/match-records";
import { cn } from "@/lib/utils";

// Event handlers only; a module helper keeps the React compiler purity rule quiet.
const clock = () => performance.now();

type Result = { ms: number; misses: number; previous: MatchRecord | null; isBest: boolean | null };

function tileText(t: MatchTile) {
  if (t.side === "term" && t.lang === "zh") return "font-hanzi text-2xl";
  const len = t.label.length;
  // three narrow columns on phones: long words shrink, then hyphenate (lang is set on the tile)
  return len <= 8 ? "text-lg" : len <= 24 ? "text-base" : "text-sm";
}

function TopBar({ exitHref, children }: { exitHref: string; children?: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-10 -mx-4 bg-paper/95 px-4 pb-2 backdrop-blur">
      <div className="flex h-12 items-center gap-3">
        <Link
          href={exitHref}
          aria-label="Thoát"
          className="-ml-2 grid size-11 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-muted hover:text-ink"
        >
          <X className="size-5" aria-hidden />
        </Link>
        {children}
      </div>
    </div>
  );
}

/** Match game (docs/PLAN-study-games.md §3): tap a term and its meaning, against the clock. */
export function MatchGame({
  boards,
  deckKey,
  exitHref,
  againHref,
  learnHref,
}: {
  boards: MatchTile[][];
  deckKey: string;
  exitHref: string;
  againHref: string;
  learnHref?: string;
}) {
  const { userId } = useMe();
  const pairs = boards.reduce((n, b) => n + b.length / 2, 0);
  const [phase, setPhase] = useState<"ready" | "playing" | "done">("ready");
  const [record, setRecord] = useState<MatchRecord | null>(null);
  const [boardIndex, setBoardIndex] = useState(0);
  const [matched, setMatched] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const [startAt, setStartAt] = useState(0);
  const [now, setNow] = useState(0);
  const [penalty, setPenalty] = useState(0);
  const [misses, setMisses] = useState(0);
  const [penaltyFlash, setPenaltyFlash] = useState(0);
  const [live, setLive] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);
  const board = boards[boardIndex] ?? [];

  useEffect(() => {
    let alive = true;
    void getMatchRecord(userId, deckKey, pairs).then((r) => alive && setRecord(r));
    return () => {
      alive = false;
    };
  }, [deckKey, pairs, userId]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => setNow(clock()), 100);
    return () => clearInterval(id);
  }, [phase]);

  // Keyboard users whose focused tile vanished land on the first tile of the next board.
  useEffect(() => {
    const active = document.activeElement;
    if (boardIndex > 0 && (active === document.body || gridRef.current?.contains(active)))
      gridRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [boardIndex]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  function start() {
    const t = clock();
    setStartAt(t);
    setNow(t);
    setPhase("playing");
  }

  const finish = useCallback(
    (ms: number, missCount: number) => {
      setResult({ ms, misses: missCount, previous: record, isBest: null });
      setPhase("done");
      void saveMatchTime(userId, deckKey, pairs, ms).then((r) =>
        setResult((cur) => (cur ? { ...cur, ...r } : cur)),
      );
    },
    [deckKey, pairs, record, userId],
  );

  function pick(tile: MatchTile) {
    if (phase !== "playing" || matched.has(tile.id)) return;
    if (wrong.length) setWrong([]);
    if (!selected) return setSelected(tile.id);
    if (selected === tile.id) return setSelected(null);
    const first = board.find((t) => t.id === selected)!;
    setSelected(null);

    if (isPair(first, tile)) {
      const next = new Set(matched).add(first.id).add(tile.id);
      setMatched(next);
      setLive(`Đúng: ${first.side === "term" ? first.label : tile.label}`);
      if (next.size === board.length) {
        const elapsed = clock() - startAt + penalty;
        // let the last pair fade before the next board (or the result) appears
        later(() => {
          if (boardIndex + 1 < boards.length) {
            setBoardIndex(boardIndex + 1);
            setMatched(new Set());
          } else {
            finish(Math.round(elapsed), misses);
          }
        }, 450);
      }
    } else {
      setWrong([first.id, tile.id]);
      setPenalty((p) => p + MATCH_PENALTY_MS);
      setMisses((m) => m + 1);
      setPenaltyFlash((f) => f + 1);
      setLive("Sai, cộng 1 giây");
      later(() => setWrong([]), 400);
    }
  }

  if (phase === "ready") {
    return (
      <div className="flex flex-1 flex-col">
        <TopBar exitHref={exitHref} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <span className="icon-tile size-20 animate-pop-in bg-wash-yellow text-sun-text">
            <Shuffle className="size-10" aria-hidden />
          </span>
          <h1 className="text-3xl text-ink">Ghép thẻ</h1>
          <p className="max-w-sm text-ink-soft">
            Ghép {pairs} từ với nghĩa của chúng nhanh nhất có thể. Mỗi lần ghép sai bị cộng 1 giây.
          </p>
          {record && (
            <p className="rounded-full bg-wash-yellow px-4 py-1.5 font-semibold text-ink">
              🏆 Kỷ lục của bạn: {formatMs(record.ms)}
            </p>
          )}
          <button
            type="button"
            onClick={start}
            autoFocus
            className="btn-3d mt-2 min-h-14 w-full max-w-xs rounded-btn bg-primary text-lg font-extrabold text-primary-foreground [--edge-color:var(--ink-blue-shade)]"
          >
            Bắt đầu
          </button>
        </div>
      </div>
    );
  }

  if (phase === "done" && result) {
    const title =
      result.isBest === null
        ? "Xong rồi!"
        : result.isBest
          ? result.previous
            ? "Kỷ lục mới!"
            : "Kỷ lục đầu tiên!"
          : "Xong rồi!";
    return (
      <div className="relative flex flex-1 flex-col py-6 text-center">
        {result.isBest && <Confetti />}
        <EndPup mood={result.isBest ? "cheer" : "happy"} emoji={result.isBest ? "🏆" : "⏱️"} />
        <h1 className="mt-3 text-2xl text-ink">
          <span className="highlighter highlighter-animate">{title}</span>
        </h1>
        <p className="mt-2 font-heading text-4xl font-black text-ink tabular-nums">
          {formatMs(result.ms)}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="flex animate-pop-in flex-col items-center gap-0.5 rounded-card bg-wash-red px-2 py-4">
            <span className="font-heading text-2xl font-black text-ink tabular-nums">{result.misses}</span>
            <span className="text-sm font-medium text-ink-soft">
              lần ghép sai{result.misses > 0 && ` (+${result.misses} giây)`}
            </span>
          </div>
          <div className="flex animate-pop-in flex-col items-center gap-0.5 rounded-card bg-wash-yellow px-2 py-4">
            <span className="font-heading text-2xl font-black text-ink tabular-nums">
              {result.previous ? formatMs(result.previous.ms) : "—"}
            </span>
            <span className="text-sm font-medium text-ink-soft">kỷ lục trước</span>
          </div>
        </div>
        <div className="mt-auto flex flex-col gap-2 pt-8 sm:flex-row">
          <a
            href={againHref}
            className="btn-3d inline-flex min-h-14 flex-1 items-center justify-center rounded-btn bg-primary px-4 text-lg font-extrabold text-primary-foreground [--edge-color:var(--ink-blue-shade)]"
          >
            Chơi lại
          </a>
          {learnHref && (
            <Link
              href={learnHref}
              className="btn-3d inline-flex min-h-14 flex-1 items-center justify-center rounded-btn border-2 border-rule bg-surface px-4 text-lg font-bold text-ink [--edge-color:var(--rule)]"
            >
              Thử chế độ Học
            </Link>
          )}
          <Link
            href={exitHref}
            className="btn-3d inline-flex min-h-14 flex-1 items-center justify-center rounded-btn border-2 border-rule bg-surface px-4 text-lg font-bold text-ink [--edge-color:var(--rule)]"
          >
            Xong
          </Link>
        </div>
      </div>
    );
  }

  const elapsed = Math.max(0, now - startAt) + penalty;
  return (
    <div className="flex flex-1 flex-col">
      <TopBar exitHref={exitHref}>
        <span role="timer" aria-label="Thời gian" className="font-heading text-xl font-black text-ink tabular-nums">
          ⏱️ {formatMs(elapsed)}
        </span>
        {penaltyFlash > 0 && wrong.length > 0 && (
          <span key={penaltyFlash} className="animate-pop-in text-sm font-bold text-danger">
            +1 giây
          </span>
        )}
        <span className="ml-auto text-sm font-bold text-ink-soft tabular-nums">
          Bảng {boardIndex + 1}/{boards.length}
        </span>
      </TopBar>
      <p aria-live="polite" className="sr-only">
        {live}
      </p>
      <div
        ref={gridRef}
        className="grid flex-1 grid-cols-3 content-center gap-2.5 py-3 sm:grid-cols-4 sm:gap-3"
      >
        {board.map((t) => {
          const gone = matched.has(t.id);
          const isSelected = selected === t.id;
          const isWrong = wrong.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              disabled={gone}
              aria-pressed={isSelected}
              aria-hidden={gone || undefined}
              onClick={() => pick(t)}
              lang={t.side === "term" ? (t.lang === "zh" ? "zh-CN" : "en") : "vi"}
              className={cn(
                "notebook-card flex min-h-20 items-center justify-center border-2 p-2 text-center font-semibold break-words hyphens-auto text-ink transition-[opacity,transform,border-color] duration-300 sm:min-h-24",
                isSelected
                  ? "-translate-y-0.5 border-ink-blue bg-wash-blue"
                  : "border-transparent hover:border-ink-blue/40",
                isWrong && "animate-shake border-margin-red bg-wash-red",
                gone && "pointer-events-none scale-90 border-jade bg-wash-jade opacity-0 delay-200",
                tileText(t),
              )}
            >
              <span className="line-clamp-3 min-w-0">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
