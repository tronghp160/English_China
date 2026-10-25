"use client";

import { Flame, Loader2, Square } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import type { LangCode } from "@/lib/lang/types";

const LANGS: { code: LangCode; label: string }[] = [
  { code: "en", label: "tiếng Anh" },
  { code: "zh", label: "tiếng Trung" },
];

type Status = { lang: LangCode; warmed: number; remaining: number | null; note: string | null };

/**
 * "Làm nóng gợi ý AI": fills the shared AI cache with words people saved, one batch
 * of 10 per call, pausing 60 / AI_RPM_LIMIT seconds between calls (or the server's
 * Retry-After when busy). Runs only while the page is open; never on its own.
 */
export function WarmCacheCard({ rpmLimit }: { rpmLimit: number }) {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const stop = useRef(false);

  const wait = (seconds: number) =>
    new Promise<void>((resolve) => {
      const end = Date.now() + seconds * 1000;
      const tick = () => (stop.current || Date.now() >= end ? resolve() : setTimeout(tick, 250));
      tick();
    });

  async function run() {
    stop.current = false;
    setRunning(true);
    const gap = Math.max(1, Math.ceil(60 / rpmLimit));
    let total = 0;
    try {
      for (const { code } of LANGS) {
        while (!stop.current) {
          setStatus({ lang: code, warmed: total, remaining: null, note: null });
          const res = await fetch("/api/admin/warm-cache", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ language: code }),
          }).catch(() => null);
          const body = res ? await res.json().catch(() => ({})) : {};
          if (res?.status === 503 && body.code === "busy") {
            const after = Number(body.retryAfter) || 20;
            setStatus({
              lang: code,
              warmed: total,
              remaining: null,
              note: `AI đang bận, thử lại sau ${after} giây.`,
            });
            await wait(after);
            continue;
          }
          if (!res?.ok) {
            setStatus({
              lang: code,
              warmed: total,
              remaining: null,
              note: body.error || "Không làm nóng được lúc này.",
            });
            return;
          }
          total += body.warmed ?? 0;
          setStatus({ lang: code, warmed: total, remaining: body.remaining ?? 0, note: null });
          if (!body.warmed) break;
          await wait(gap);
        }
      }
      if (!stop.current)
        setStatus((s) => (s ? { ...s, note: "Xong: không còn từ nào cần làm nóng." } : s));
    } finally {
      setRunning(false);
    }
  }

  const langLabel = status ? LANGS.find((l) => l.code === status.lang)?.label : null;

  return (
    <section
      aria-label="Làm nóng gợi ý AI"
      className="mt-4 flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-sm sm:flex-row sm:items-center dark:border dark:border-border"
    >
      <IconTile icon={Flame} tone="orange" size={44} />
      <div className="min-w-0 flex-1">
        <p className="font-bold">Làm nóng gợi ý AI</p>
        <p className="text-sm text-fg-muted">
          Nhờ AI điền trước các từ mọi người đã lưu (10 từ mỗi lần, tính vào lượt AI của bạn). Sau
          đó ai tra lại cũng có ngay bản AI, không tốn lượt.
        </p>
        {status && (
          <p className="mt-1 flex items-start gap-1.5 text-sm text-fg" aria-live="polite">
            {running && <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin" aria-hidden />}
            <span>
              Đã làm <span className="font-bold tabular-nums">{status.warmed}</span> từ
              {running && langLabel ? ` · đang làm ${langLabel}` : ""}
              {status.remaining !== null && status.remaining > 0
                ? ` · còn khoảng ${status.remaining} từ`
                : ""}
              {status.note ? `. ${status.note}` : ""}
            </span>
          </p>
        )}
      </div>
      {running ? (
        <Button type="button" variant="outline" onClick={() => (stop.current = true)}>
          <Square aria-hidden />
          Dừng
        </Button>
      ) : (
        <Button type="button" onClick={() => void run()}>
          Chạy
        </Button>
      )}
    </section>
  );
}
