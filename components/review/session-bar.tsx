"use client";

import { CloudOff, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Pup } from "@/components/mascot/pup";
import type { PupMood } from "@/lib/mascot/lines";
import { subscribeOutbox, type OutboxStatus } from "@/lib/srs/outbox";
import { cn } from "@/lib/utils";

export function useOutboxStatus() {
  const [status, setStatus] = useState<OutboxStatus>({ pending: 0, syncing: false, error: null });
  useEffect(() => subscribeOutbox(setStatus), []);
  return status;
}

/**
 * Top bar of a focus session: exit, a 12px progress bar with the mascot standing at its end
 * (it slides along as the bar grows and only changes its face), the count, and the sync state.
 */
export function SessionBar({
  done,
  total,
  exitHref,
  pup,
  segments,
  label,
  ariaLabel = "Tiến độ phiên",
}: {
  done: number;
  total: number;
  exitHref: string;
  /** Mood of the tiny mascot at the head of the bar; omit to hide it (Bin off). */
  pup?: { mood: PupMood };
  /** Two-part bar (Learn): `mastered` in green, then `learning` in sun yellow, out of `total`. */
  segments?: { mastered: number; learning: number };
  /** Text at the right end instead of done/total */
  label?: string;
  ariaLabel?: string;
}) {
  const sync = useOutboxStatus();
  const pct = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const pctOf = (n: number) => (total ? Math.min(100, (n / total) * 100) : 0);
  return (
    <div className="sticky top-0 z-10 -mx-4 bg-canvas/80 px-4 pb-2 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-2">
        <Link
          href={exitHref}
          aria-label="Thoát phiên"
          className="-ml-2 grid size-11 shrink-0 place-items-center rounded-full text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <X className="size-5" strokeWidth={1.75} aria-hidden />
        </Link>
        <div className="relative flex-1 pt-6">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={done}
            aria-label={ariaLabel}
            className="relative h-3 w-full overflow-hidden rounded-full bg-surface-3"
          >
            {segments ? (
              <>
                <div className="absolute inset-y-0 left-0 bg-success transition-[width] duration-500 ease-[var(--ease-spring)]" style={{ width: `${pctOf(segments.mastered)}%` }} />
                <div
                  className="absolute inset-y-0 bg-streak transition-[left,width] duration-500 ease-[var(--ease-out)]"
                  style={{ left: `${pctOf(segments.mastered)}%`, width: `${pctOf(segments.learning)}%` }}
                />
              </>
            ) : (
              <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-[var(--ease-spring)]" style={{ width: `${pct}%` }} />
            )}
          </div>
          {pup && (
            <span
              aria-hidden
              className={cn("absolute top-0 -translate-x-1/2 transition-[left] duration-500 ease-[var(--ease-out)]")}
              style={{ left: `clamp(14px, ${pct}%, calc(100% - 14px))` }}
            >
              <Pup mood={pup.mood} size={28} />
            </span>
          )}
        </div>
        <span className="min-w-12 text-right text-[0.9375rem] font-bold whitespace-nowrap text-fg-muted tabular-nums">
          {label ?? `${done}/${total}`}
        </span>
        {sync.pending > 0 && (
          <span
            className="grid size-8 place-items-center text-fg-muted"
            title={sync.error ?? "Đang gửi kết quả…"}
            aria-label={sync.error ?? `Đang gửi ${sync.pending} kết quả`}
          >
            {sync.syncing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CloudOff className="size-4" aria-hidden />}
          </span>
        )}
      </div>
      {sync.pending > 0 && sync.error && !sync.syncing && (
        <p role="status" className="rounded-md bg-streak-soft px-3 py-2 text-sm text-streak-fg">
          {sync.error}
        </p>
      )}
    </div>
  );
}
