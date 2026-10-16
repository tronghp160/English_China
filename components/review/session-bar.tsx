"use client";

import { CloudOff, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { subscribeOutbox, type OutboxStatus } from "@/lib/srs/outbox";

export function useOutboxStatus() {
  const [status, setStatus] = useState<OutboxStatus>({ pending: 0, syncing: false, error: null });
  useEffect(() => subscribeOutbox(setStatus), []);
  return status;
}

/** Top bar of a focus session: exit, progress, offline/sync state. */
export function SessionBar({
  done,
  total,
  exitHref,
}: {
  done: number;
  total: number;
  exitHref: string;
}) {
  const sync = useOutboxStatus();
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="sticky top-0 z-10 -mx-4 bg-paper/95 px-4 pb-2 backdrop-blur">
      <div className="flex h-12 items-center gap-3">
        <Link
          href={exitHref}
          aria-label="Thoát phiên"
          className="-ml-2 grid size-11 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-muted hover:text-ink"
        >
          <X className="size-5" aria-hidden />
        </Link>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          aria-label="Tiến độ phiên"
          className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-ink-blue transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="min-w-12 text-right text-sm text-ink-soft tabular-nums">
          {done}/{total}
        </span>
        {sync.pending > 0 && (
          <span
            className="grid size-8 place-items-center text-ink-soft"
            title={sync.error ?? "Đang gửi kết quả…"}
            aria-label={sync.error ?? `Đang gửi ${sync.pending} kết quả`}
          >
            {sync.syncing ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <CloudOff className="size-4" aria-hidden />
            )}
          </span>
        )}
      </div>
      {sync.pending > 0 && sync.error && !sync.syncing && (
        <p role="status" className="rounded-[10px] bg-wash-yellow px-3 py-2 text-sm text-ink">
          {sync.error}
        </p>
      )}
    </div>
  );
}
