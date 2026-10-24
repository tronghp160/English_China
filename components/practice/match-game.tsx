"use client";

import { Clock, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMe } from "@/components/app-shell/me-provider";
import { Celebration } from "@/components/review/celebration";
import { Button } from "@/components/ui/button";
import { formatMs, isPair, MATCH_PENALTY_MS, type MatchTile } from "@/lib/practice/match";
import { getMatchRecord, saveMatchTime, type MatchRecord } from "@/lib/practice/match-records";
import { cn } from "@/lib/utils";

// Event handlers only; a module helper keeps the React compiler purity rule quiet.
const clock = () => performance.now();

type Result = { ms: number; misses: number; previous: MatchRecord | null; isBest: boolean | null };

function tileText(t: MatchTile) {
  // words are set in the serif, meanings in the sans
  if (t.side === "term" && t.lang === "zh") return "font-hanzi text-2xl";
  const len = t.label.length;
  const face = t.side === "term" ? "font-display" : "";
  // three narrow columns on phones: long words shrink, then hyphenate (lang is set on the tile)
  return cn(face, len <= 8 ? "text-lg" : len <= 24 ? "text-base" : "text-sm");
}

function TopBar({ exitHref, children }: { exitHref: string; children?: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-10 -mx-4 bg-canvas/95 px-4 pb-2 backdrop-blur-sm">
      <div className="flex h-14 items-center gap-3">
        <Link
          href={exitHref}
          aria-label="Thoát"
          className="-ml-2 grid size-11 shrink-0 place-items-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <X className="size-5" strokeWidth={1.75} aria-hidden />
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
          <h1 className="text-xl">Ghép thẻ</h1>
          <p className="max-w-sm text-fg-muted">
            Ghép {pairs} từ với nghĩa của chúng nhanh nhất có thể. Mỗi lần ghép sai bị cộng 1 giây.
          </p>
          {record && <p className="text-fg">Kỷ lục của bạn: <span className="font-display tabular-nums">{formatMs(record.ms)}</span></p>}
          <Button type="button" size="lg" onClick={start} autoFocus className="mt-2 w-full max-w-xs">
            Bắt đầu
          </Button>
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
      <div className="flex flex-1 flex-col py-6">
        <Celebration mood={result.isBest ? "cheer" : "happy"} confetti={Boolean(result.isBest)} />
        <h1 className="mt-6 text-center text-xl">{title}</h1>
        <p className="mt-2 text-center font-display text-5xl font-semibold text-fg tabular-nums">{formatMs(result.ms)}</p>
        <dl className="mt-6 border-t border-border">
          <div className="flex items-baseline justify-between gap-4 border-b border-border py-3">
            <dt className="text-fg-muted">Thời gian</dt>
            <dd className="font-display text-xl font-semibold tabular-nums">{formatMs(result.ms)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-b border-border py-3">
            <dt className="text-fg-muted">Kỷ lục trước</dt>
            <dd className="font-display text-xl font-semibold tabular-nums">{result.previous ? formatMs(result.previous.ms) : "—"}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-b border-border py-3">
            <dt className="text-fg-muted">Số lần ghép sai</dt>
            <dd className="font-display text-xl font-semibold tabular-nums">
              {result.misses}
              {result.misses > 0 && <span className="ml-1.5 font-sans text-sm font-normal text-fg-muted">(+{result.misses} giây)</span>}
            </dd>
          </div>
        </dl>
        <div className="mt-auto flex flex-col gap-2 pt-8 sm:flex-row">
          <Button asChild size="lg" className="flex-1">
            <a href={againHref}>Chơi lại</a>
          </Button>
          {learnHref && (
            <Button asChild size="lg" variant="outline" className="flex-1">
              <Link href={learnHref}>Thử chế độ Học</Link>
            </Button>
          )}
          <Button asChild size="lg" variant="outline" className="flex-1">
            <Link href={exitHref}>Xong</Link>
          </Button>
        </div>
      </div>
    );
  }

  const elapsed = Math.max(0, now - startAt) + penalty;
  return (
    <div className="flex flex-1 flex-col">
      <TopBar exitHref={exitHref}>
        <span role="timer" aria-label="Thời gian" className="inline-flex items-center gap-1.5 text-lg font-semibold text-fg tabular-nums">
          <Clock className="size-4 text-fg-muted" strokeWidth={1.75} aria-hidden />
          {formatMs(elapsed)}
        </span>
        {penaltyFlash > 0 && wrong.length > 0 && (
          <span key={penaltyFlash} className="animate-in fade-in-0 slide-in-from-bottom-2 text-sm font-semibold text-danger-fg duration-200">
            +1 giây
          </span>
        )}
        <span className="ml-auto text-sm font-medium text-fg-muted tabular-nums">
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
                "flex min-h-20 items-center justify-center rounded-md border border-border-strong bg-surface p-2 text-center font-medium break-words hyphens-auto text-fg transition-colors duration-[var(--dur-fast)] sm:min-h-24",
                isSelected ? "border-primary bg-primary-soft ring-1 ring-primary" : "hover:border-fg-muted/60",
                isWrong && "animate-shake border-danger bg-danger-soft",
                gone && "tile-gone",
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
