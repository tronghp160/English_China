"use client";

import { Check, Lock, Play, Star, Trophy } from "lucide-react";
import { useMe } from "@/components/app-shell/me-provider";
import { Pup } from "@/components/mascot/pup";
import { Button } from "@/components/ui/button";
import type { StudyWord } from "@/lib/practice";
import { masteryDots, type LearnState } from "@/lib/practice/learn";
import { cn } from "@/lib/utils";
import { MasteryDots } from "./mastery-dots";

const W = 360;
const ROW = 104;
/** Where each stage sits across the road (fraction of the width), winding left and right like the mockup. */
const SWAY = [0.5, 0.26, 0.64, 0.34, 0.7, 0.42, 0.62, 0.3];

type NodeKind = "done" | "current" | "locked";

/**
 * The road of Learn mode (REDESIGN_V3 §8.3, mockup 04): one round-shaped button per stage, a dotted path between
 * them, stars over the finished ones, Bin beside the one to play and a trophy at the end. Every stage is one
 * round of the learn logic; the picture only shows how far along you are.
 */
export function LearnMap({
  state,
  stages,
  done,
  stars,
  next,
  words,
  onStart,
}: {
  state: LearnState;
  /** How many stage nodes to draw (before the trophy) */
  stages: number;
  /** Finished rounds */
  done: number;
  stars: number[];
  /** What the next round asks: ids, how many are new and how many are review */
  next: { ids: string[]; fresh: number; review: number };
  words: Map<string, StudyWord>;
  onStart: () => void;
}) {
  const { prefs } = useMe();
  const count = stages + 1; // + the trophy
  const height = count * ROW + 24;
  const points = Array.from({ length: count }, (_, i) => ({ x: SWAY[i % SWAY.length] * W, y: 48 + i * ROW }));
  const kind = (i: number): NodeKind => (i < done ? "done" : i === done ? "current" : "locked");
  const stageNo = done + 1;

  const path = (from: number, to: number) => {
    const a = points[from];
    const b = points[to];
    const my = (a.y + b.y) / 2;
    return `M${a.x} ${a.y} C${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
  };
  const shown = next.ids.slice(0, 4);

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative mx-auto w-full max-w-[22.5rem] flex-1">
        <svg viewBox={`0 0 ${W} ${height}`} className="block w-full" aria-hidden fill="none">
          {Array.from({ length: count - 1 }, (_, i) => (
            <path
              key={i}
              d={path(i, i + 1)}
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray="0.1 16"
              stroke={i < done ? "var(--success)" : "var(--border-strong)"}
            />
          ))}
        </svg>

        {points.map((p, i) => {
          const isTrophy = i === count - 1;
          const k = isTrophy ? "locked" : kind(i);
          const left = `${(p.x / W) * 100}%`;
          const top = `${(p.y / height) * 100}%`;
          const style = { left, top };
          if (isTrophy) {
            return (
              <div key="trophy" role="img" aria-label="Phần thưởng cuối" style={style} className="absolute w-[21%] -translate-x-1/2 -translate-y-1/2">
                <span className="grid aspect-[76/64] place-items-center rounded-full bg-streak-soft text-streak-fg shadow-[0_6px_0_0_var(--c-sun)]">
                  <Trophy className="size-[38%]" strokeWidth={2} aria-hidden />
                </span>
              </div>
            );
          }
          const star = stars[i] ?? 0;
          return (
            <div key={i} style={style} className={cn("absolute -translate-x-1/2 -translate-y-1/2", k === "current" ? "w-[22%]" : "w-[19.5%]")}>
              {k === "done" && (
                <span aria-hidden className="absolute -top-[42%] left-1/2 flex -translate-x-1/2 gap-0.5">
                  {[1, 2, 3].map((n) => (
                    <Star
                      key={n}
                      className={cn("size-[0.9375rem] animate-pop", n <= star ? "fill-c-sun stroke-c-sun-fg" : "fill-surface-3 stroke-border-strong")}
                      style={{ animationDelay: `${n * 120}ms` }}
                      strokeWidth={1.6}
                    />
                  ))}
                </span>
              )}
              {k === "current" ? (
                <>
                  <span aria-hidden className="absolute -inset-[10%] rounded-full ring-4 ring-primary/25" />
                  <button
                    type="button"
                    onClick={onStart}
                    aria-label={`Chặng ${i + 1}, đang học. Bắt đầu`}
                    className="relative grid aspect-[80/74] w-full place-items-center rounded-full bg-primary text-on-primary shadow-[0_6px_0_0_var(--primary-press)] transition-transform active:translate-y-1 active:shadow-[0_2px_0_0_var(--primary-press)]"
                  >
                    <Play className="size-[40%] translate-x-[6%] fill-current" aria-hidden />
                  </button>
                  <span className="absolute top-full left-1/2 mt-3 -translate-x-1/2 rounded-full bg-surface px-3 py-1 text-[0.8125rem] font-extrabold whitespace-nowrap text-primary-fg shadow-sm">
                    Chặng {i + 1}
                  </span>
                </>
              ) : (
                <div
                  role="img"
                  aria-label={k === "done" ? `Chặng ${i + 1}, đã xong, ${star} sao` : `Chặng ${i + 1}, chưa mở`}
                  className={cn(
                    "grid aspect-[70/64] w-full place-items-center rounded-full",
                    k === "done" ? "bg-success text-on-primary shadow-[0_6px_0_0_var(--rate-easy)]" : "bg-surface-3 text-fg-muted shadow-[0_6px_0_0_var(--border-strong)]",
                  )}
                >
                  {k === "done" ? <Check className="size-[44%]" strokeWidth={3.4} aria-hidden /> : <Lock className="size-[34%]" aria-hidden />}
                </div>
              )}
            </div>
          );
        })}

        {prefs.mascot && (
          <div
            className={cn("pointer-events-none absolute w-[27%] -translate-y-1/2", points[done].x / W > 0.5 && "-translate-x-full")}
            style={{
              left: `${((points[done].x + (points[done].x / W > 0.5 ? -62 : 62)) / W) * 100}%`,
              top: `${((points[done].y + 14) / height) * 100}%`,
            }}
          >
            <Pup mood="happy" size={96} className="size-full" />
          </div>
        )}
      </div>

      <section aria-label={`Chặng ${stageNo}`} className="sticky bottom-0 -mx-4 mt-4 rounded-t-xl bg-surface px-4 pt-4 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-[0_-10px_30px_-16px_rgb(16_24_40/0.2)]">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[1.1875rem] font-extrabold tracking-[-0.02em]">Chặng {stageNo}</h2>
          <p className="text-sm text-fg-muted">
            {next.fresh > 0 && `${next.fresh} từ mới`}
            {next.fresh > 0 && next.review > 0 && ", "}
            {next.review > 0 && `${next.review} từ ôn lại`}
          </p>
        </div>
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Các từ của chặng này">
          {shown.map((id) => {
            const w = words.get(id);
            if (!w) return null;
            const fresh = masteryDots(state, id) === 0;
            const zh = w.language === "zh";
            return (
              <li key={id} className={cn("flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.9375rem]", fresh ? "bg-streak-soft" : "bg-surface-2")}>
                <span lang={zh ? "zh-CN" : "en"} className={cn("font-bold", zh && "font-hanzi")}>
                  {w.term}
                </span>
                {fresh ? <span className="text-xs font-extrabold text-streak-fg">Mới</span> : <MasteryDots filled={masteryDots(state, id)} />}
              </li>
            );
          })}
          {next.ids.length > shown.length && (
            <li className="rounded-full bg-surface-2 px-3 py-1.5 text-[0.9375rem] text-fg-muted">+{next.ids.length - shown.length}</li>
          )}
        </ul>
        <Button type="button" variant="pressable" size="xl" className="mt-4 w-full" onClick={onStart} autoFocus>
          Bắt đầu chặng {stageNo}
        </Button>
      </section>
    </div>
  );
}
