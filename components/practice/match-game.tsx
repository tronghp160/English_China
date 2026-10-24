"use client";

import { Flame, Medal, Timer, Trophy, X } from "lucide-react";
import { useReducedMotion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMe } from "@/components/app-shell/me-provider";
import { Burst } from "@/components/fx/burst";
import { Confetti } from "@/components/fx/confetti";
import { Pup } from "@/components/mascot/pup";
import { useBinAction } from "@/components/mascot/use-bin";
import { Celebration } from "@/components/review/celebration";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { haptic } from "@/lib/haptics";
import { formatMs, isPair, MATCH_PENALTY_MS, type MatchTile } from "@/lib/practice/match";
import { getMatchRecord, saveMatchTime, type MatchRecord } from "@/lib/practice/match-records";
import { playSfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";

// Event handlers only; a module helper keeps the React compiler purity rule quiet.
const clock = () => performance.now();

/** A run of this many right pairs in a row flashes the timer green. */
const RUN_FOR_FLASH = 3;
/** Within this much of the old record the result is a silver medal. */
const SILVER_WITHIN = 1.2;
const COUNT_STEP_MS = 700;

type Result = { ms: number; misses: number; previous: MatchRecord | null; isBest: boolean | null };
type Medal = "gold" | "silver" | "bronze";

function medalFor(result: Result): Medal {
  if (result.isBest) return "gold";
  if (result.previous && result.ms <= result.previous.ms * SILVER_WITHIN) return "silver";
  return "bronze";
}

const MEDAL_LOOK: Record<Medal, { label: string; tile: string }> = {
  gold: { label: "Huy chương vàng", tile: "bg-c-sun-soft text-c-sun-fg shadow-[0_6px_0_0_var(--c-sun)]" },
  silver: { label: "Huy chương bạc", tile: "bg-surface-3 text-fg-muted shadow-[0_6px_0_0_var(--border-strong)]" },
  bronze: { label: "Huy chương đồng", tile: "bg-c-orange-soft text-c-orange-fg shadow-[0_6px_0_0_var(--c-orange)]" },
};

function tileText(t: MatchTile) {
  // words are set in the display face, meanings in the sans
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
          <X className="size-5" strokeWidth={2} aria-hidden />
        </Link>
        {children}
      </div>
    </div>
  );
}

/** Bin holding up a stopwatch, with a line in a bubble. */
function StopwatchBin({ line, mood, action, size }: { line: string; mood: Parameters<typeof Pup>[0]["mood"]; action?: Parameters<typeof Pup>[0]["action"]; size: number }) {
  const { prefs } = useMe();
  if (!prefs.mascot) return null;
  return (
    <div className="flex items-end justify-center gap-2">
      <div className="relative shrink-0">
        <Pup mood={mood} action={action} size={size} />
        <span
          aria-hidden
          className="absolute -right-2 bottom-1 grid size-8 place-items-center rounded-full bg-c-sun-soft text-c-sun-fg shadow-sm dark:border dark:border-border"
        >
          <Timer className="size-[1.125rem]" strokeWidth={2} />
        </span>
      </div>
      <p className="mb-3 max-w-[15rem] rounded-lg rounded-bl-[4px] bg-surface px-3.5 py-2 text-[0.9375rem] font-semibold shadow-sm dark:border dark:border-border">
        {line}
      </p>
    </div>
  );
}

/** Match game (docs/PLAN-study-games.md §3, REDESIGN_V3 §8.5): tap a term and its meaning, against the clock. */
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
  const reduced = useReducedMotion() ?? false;
  const bin = useBinAction("happy");
  const pairs = boards.reduce((n, b) => n + b.length / 2, 0);
  const [phase, setPhase] = useState<"ready" | "countdown" | "playing" | "done">("ready");
  const [count, setCount] = useState(3);
  const [record, setRecord] = useState<MatchRecord | null>(null);
  const [boardIndex, setBoardIndex] = useState(0);
  const [matched, setMatched] = useState<Set<string>>(() => new Set());
  const [rights, setRights] = useState(0);
  const [run, setRun] = useState(0);
  const [flash, setFlash] = useState(0);
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

  const begin = useCallback(() => {
    const t = clock();
    setStartAt(t);
    setNow(t);
    setPhase("playing");
  }, []);

  // 3 - 2 - 1, then the board appears. Reduced motion (and the E2E) go straight in.
  useEffect(() => {
    if (phase !== "countdown") return;
    playSfx("tick");
    const id = setTimeout(() => (count <= 1 ? begin() : setCount(count - 1)), COUNT_STEP_MS);
    return () => clearTimeout(id);
  }, [begin, count, phase]);

  function start() {
    if (reduced) return begin();
    setCount(3);
    setPhase("countdown");
  }

  const finish = useCallback(
    (ms: number, missCount: number) => {
      setResult({ ms, misses: missCount, previous: record, isBest: null });
      setPhase("done");
      playSfx("complete");
      void saveMatchTime(userId, deckKey, pairs, ms).then((r) =>
        setResult((cur) => (cur ? { ...cur, ...r } : cur)),
      );
    },
    [deckKey, pairs, record, userId],
  );

  function pick(tile: MatchTile) {
    if (phase !== "playing" || matched.has(tile.id)) return;
    if (wrong.length) setWrong([]);
    if (!selected) {
      playSfx("pop");
      return setSelected(tile.id);
    }
    if (selected === tile.id) return setSelected(null);
    const first = board.find((t) => t.id === selected)!;
    setSelected(null);

    if (isPair(first, tile)) {
      const next = new Set(matched).add(first.id).add(tile.id);
      setMatched(next);
      setRights((n) => n + 1);
      const streak = run + 1;
      setRun(streak);
      if (streak % RUN_FOR_FLASH === 0) {
        setFlash((f) => f + 1);
        playSfx("combo");
        bin.play("jump");
      } else {
        playSfx("correct");
        haptic("light");
      }
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
      setRun(0);
      setLive("Sai, cộng 1 giây");
      playSfx("wrong");
      haptic("error");
      bin.play("shakeHead");
      later(() => setWrong([]), 400);
    }
  }

  if (phase === "ready") {
    return (
      <div className="flex flex-1 flex-col">
        <TopBar exitHref={exitHref} />
        <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <StopwatchBin mood="happy" size={104} line="Sẵn sàng chưa? Mình bấm giờ nhé!" />
          <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-xl bg-surface px-5 py-6 shadow-md dark:border dark:border-border">
            <h1 className="text-xl">Ghép thẻ</h1>
            <p className="text-fg-muted">
              Ghép {pairs} từ với nghĩa của chúng nhanh nhất có thể. Mỗi lần ghép sai bị cộng 1 giây.
            </p>
            {record ? (
              <Badge variant="soft" tone="sun" className="gap-1.5 px-3 py-1.5 text-sm">
                <Trophy className="size-4" strokeWidth={2} aria-hidden />
                Kỷ lục của bạn: <span className="font-display tabular-nums">{formatMs(record.ms)}</span>
              </Badge>
            ) : (
              <p className="text-sm text-fg-muted">Chưa có kỷ lục. Lần đầu nào cũng là kỷ lục.</p>
            )}
          </div>
          <Button type="button" variant="pressable" size="xl" onClick={start} autoFocus className="w-full max-w-sm">
            Bắt đầu
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "countdown") {
    return (
      <div className="flex flex-1 flex-col">
        <TopBar exitHref={exitHref} />
        <div role="status" aria-live="assertive" className="grid flex-1 place-items-center">
          <span key={count} aria-label={`Bắt đầu sau ${count}`} className="animate-pop font-display text-[8rem] leading-none font-extrabold text-primary tabular-nums">
            {count}
          </span>
        </div>
      </div>
    );
  }

  if (phase === "done" && result) {
    const medal = medalFor(result);
    const look = MEDAL_LOOK[medal];
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
        {result.isBest && <Confetti preset="record" />}
        <Celebration mood={result.isBest ? "cheer" : "happy"} confetti={false} className="pr-12">
          <span
            role="img"
            aria-label={look.label}
            className={cn("grid size-24 animate-pop place-items-center rounded-full", look.tile)}
          >
            <Medal className="size-11" strokeWidth={2} aria-hidden />
          </span>
        </Celebration>
        <h1 className="mt-6 text-center text-xl">{title}</h1>
        <p className="mt-2 text-center font-display text-5xl font-extrabold text-fg tabular-nums">{formatMs(result.ms)}</p>
        <dl className="mt-6 divide-y divide-border rounded-xl bg-surface px-4 shadow-sm dark:border dark:border-border">
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-fg-muted">Thời gian</dt>
            <dd className="font-display text-xl font-extrabold tabular-nums">{formatMs(result.ms)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-fg-muted">Kỷ lục trước</dt>
            <dd className="font-display text-xl font-extrabold tabular-nums">{result.previous ? formatMs(result.previous.ms) : "—"}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-fg-muted">Số lần ghép sai</dt>
            <dd className="font-display text-xl font-extrabold tabular-nums">
              {result.misses}
              {result.misses > 0 && <span className="ml-1.5 font-sans text-sm font-normal text-fg-muted">(+{result.misses} giây)</span>}
            </dd>
          </div>
        </dl>
        <div className="mt-auto flex flex-col gap-2 pt-8 sm:flex-row">
          <Button asChild variant="pressable" size="lg" className="flex-1">
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
  const nearRecord = record !== null && elapsed > record.ms * 0.7 && elapsed < record.ms;
  const line = nearRecord
    ? "Nhanh lên, sắp phá kỷ lục rồi!"
    : run >= RUN_FOR_FLASH
      ? "Liền tay quá!"
      : misses > 0 && run === 0
        ? "Bình tĩnh, ghép tiếp nào."
        : "Chọn một từ rồi chọn nghĩa của nó.";
  const seconds = formatMs(elapsed).replace(" giây", "");
  return (
    <div className="flex flex-1 flex-col">
      <TopBar exitHref={exitHref}>
        <h1 className="text-lg leading-none font-extrabold tracking-[-0.02em]">Ghép thẻ</h1>
        <span className="ml-auto flex items-center gap-2">
          {record && (
            <Badge variant="soft" tone="sun" className="gap-1 tabular-nums">
              <Trophy className="size-3.5" strokeWidth={2} aria-hidden />
              Kỷ lục {formatMs(record.ms).replace(" giây", "s")}
            </Badge>
          )}
          <span className="text-sm font-semibold text-fg-muted tabular-nums">
            Bảng {boardIndex + 1}/{boards.length}
          </span>
        </span>
      </TopBar>

      <div className="flex flex-col items-center gap-2 pt-1">
        <div className="relative">
          <span
            key={flash}
            role="timer"
            aria-label="Thời gian"
            className={cn(
              "block font-display text-[3.25rem] leading-none font-extrabold tracking-[-0.03em] tabular-nums transition-colors",
              flash > 0 && run > 0 && run % RUN_FOR_FLASH === 0 ? "animate-pop text-success-fg" : "text-fg",
            )}
          >
            {seconds}
            <span className="ml-0.5 text-xl font-extrabold text-fg-muted">s</span>
          </span>
          {penaltyFlash > 0 && wrong.length > 0 && (
            <span key={penaltyFlash} aria-hidden className="match-float absolute -top-1 -right-12 text-lg font-extrabold text-danger-fg">
              +1s
            </span>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Badge variant="soft" tone="mint" className="gap-1 tabular-nums">
            {run >= 2 && <Flame className="size-3.5" strokeWidth={2} aria-hidden />}
            Ghép đúng ×{rights}
          </Badge>
          {misses > 0 && (
            <Badge variant="soft" tone="red" className="tabular-nums">
              {misses} lần ghép sai
            </Badge>
          )}
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {live}
      </p>
      <div ref={gridRef} className="grid flex-1 grid-cols-3 content-center gap-2.5 py-4 sm:grid-cols-4 sm:gap-3">
        {board.map((t, i) => {
          const gone = matched.has(t.id);
          const isSelected = selected === t.id;
          const isWrong = wrong.includes(t.id);
          return (
            <div key={t.id} style={{ "--i": i } as React.CSSProperties} className="match-tile-in">
              <button
                type="button"
                disabled={gone}
                aria-pressed={isSelected}
                aria-hidden={gone || undefined}
                onClick={() => pick(t)}
                lang={t.side === "term" ? (t.lang === "zh" ? "zh-CN" : "en") : "vi"}
                className={cn(
                  "relative flex min-h-[5.75rem] w-full items-center justify-center rounded-[1.125rem] border-2 border-border-strong bg-surface p-2 text-center font-semibold break-words hyphens-auto text-fg shadow-[0_3px_0_0_var(--border-strong)] transition-[transform,box-shadow,background-color,border-color] duration-[var(--dur-fast)] sm:min-h-24",
                  isSelected
                    ? "-translate-y-1 border-primary bg-primary-soft text-primary-fg shadow-[0_6px_0_0_var(--primary-press)]"
                    : "hover:border-fg-muted/60 active:translate-y-0.5 active:shadow-[0_1px_0_0_var(--border-strong)]",
                  isWrong && "animate-shake border-danger bg-danger-soft shadow-[0_3px_0_0_var(--danger)]",
                  gone && "tile-gone",
                  tileText(t),
                )}
              >
                <span className="line-clamp-3 min-w-0">{t.label}</span>
                {gone && <Burst trigger={1} palette="success" radius={34} />}
              </button>
            </div>
          );
        })}
      </div>

      <StopwatchBin line={line} mood={bin.mood} action={bin.action} size={72} />
    </div>
  );
}
