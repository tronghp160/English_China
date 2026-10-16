"use client";

import Link from "next/link";
import { formatDuration } from "@/lib/format";
import type { LangCode } from "@/lib/lang/types";
import { cn } from "@/lib/utils";
import { useOutboxStatus } from "./session-bar";

export type SessionResult = {
  wordId: string;
  term: string;
  language: LangCode;
  meaning: string;
  rating: number;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xl font-bold text-ink tabular-nums">{value}</span>
      <span className="text-sm text-ink-soft">{label}</span>
    </div>
  );
}

/** End of a review or practice session (§10.3). */
export function SessionSummary({
  results,
  durationMs,
  xp,
  tomorrowDue,
  exitHref,
  againHref,
  correctLabel = "Nhớ",
  missedTitle = "Từ đã quên",
}: {
  results: SessionResult[];
  durationMs: number;
  xp: number;
  tomorrowDue?: number;
  exitHref: string;
  againHref?: string;
  correctLabel?: string;
  missedTitle?: string;
}) {
  const sync = useOutboxStatus();
  const total = results.length;
  const remembered = results.filter((r) => r.rating > 1).length;
  const pct = total ? Math.round((remembered / total) * 100) : 0;
  const missed = [
    ...new Map(results.filter((r) => r.rating === 1).map((r) => [r.wordId, r])).values(),
  ];

  return (
    <div className="flex flex-1 flex-col py-6">
      <h1 className="text-2xl font-bold text-ink">
        {total ? (
          <span className="highlighter highlighter-animate">Xong phiên rồi!</span>
        ) : (
          "Chưa có thẻ nào"
        )}
      </h1>
      {tomorrowDue !== undefined && (
        <p className="mt-2 text-ink-soft">
          {tomorrowDue > 0
            ? `Ngày mai có ${tomorrowDue} từ cần ôn.`
            : "Ngày mai chưa có từ nào đến hạn."}
        </p>
      )}

      {total > 0 && (
        <div className="notebook-card mt-6 grid grid-cols-2 gap-5 py-5 pr-5 sm:grid-cols-4">
          <Stat label={total === 1 ? "thẻ" : "lượt"} value={String(total)} />
          <Stat label={correctLabel} value={`${pct}%`} />
          <Stat label="Thời gian" value={formatDuration(durationMs)} />
          <Stat label="XP nhận được" value={`+${xp}`} />
        </div>
      )}

      {sync.pending > 0 && (
        <p role="status" className="mt-4 rounded-[10px] bg-wash-yellow px-3 py-2 text-sm text-ink">
          Còn {sync.pending} kết quả chưa gửi được. Chúng được lưu trên máy và sẽ tự gửi khi có mạng
          — đừng xóa dữ liệu trình duyệt.
        </p>
      )}

      {missed.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-medium text-ink-soft">
            {missedTitle} ({missed.length})
          </h2>
          <ul className="ruled-list rounded-[12px] border border-rule bg-surface">
            {missed.map((m) => (
              <li key={m.wordId}>
                <Link
                  href={`/words/${m.wordId}`}
                  className="flex min-h-12 items-center gap-3 px-4 py-2 hover:bg-muted"
                >
                  <span
                    lang={m.language === "zh" ? "zh-CN" : "en"}
                    className={cn(
                      "font-semibold text-ink",
                      m.language === "zh" && "font-hanzi text-lg",
                    )}
                  >
                    {m.term}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{m.meaning}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-8 sm:flex-row">
        <Link
          href={exitHref}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-[10px] bg-primary px-4 font-medium text-primary-foreground"
        >
          Về trang Hôm nay
        </Link>
        {againHref && (
          <a
            href={againHref}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-[10px] border border-rule bg-surface px-4 font-medium text-ink"
          >
            Luyện tiếp
          </a>
        )}
      </div>
    </div>
  );
}
