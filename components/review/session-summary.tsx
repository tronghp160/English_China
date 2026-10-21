"use client";

import Link from "next/link";
import { formatDuration } from "@/lib/format";
import type { LangCode } from "@/lib/lang/types";
import { cn } from "@/lib/utils";
import { Confetti } from "./confetti";
import { useOutboxStatus } from "./session-bar";

export type SessionResult = {
  wordId: string;
  term: string;
  language: LangCode;
  meaning: string;
  rating: number;
};

function Stat({ label, value, emoji, tone }: { label: string; value: string; emoji: string; tone: string }) {
  return (
    <div className={cn("flex animate-pop-in flex-col items-center gap-0.5 rounded-card px-2 py-4 text-center", tone)}>
      <span aria-hidden className="text-2xl">
        {emoji}
      </span>
      <span className="font-heading text-2xl font-black text-ink tabular-nums">{value}</span>
      <span className="text-sm font-medium text-ink-soft">{label}</span>
    </div>
  );
}

function cheer(pct: number) {
  if (pct >= 90) return { emoji: "🏆", text: "Xuất sắc! Trí nhớ siêu đỉnh." };
  if (pct >= 70) return { emoji: "🎉", text: "Tuyệt vời! Cứ thế phát huy nhé." };
  if (pct >= 40) return { emoji: "💪", text: "Khá lắm! Ôn thêm chút là thuộc ngay." };
  return { emoji: "🌱", text: "Khởi đầu nào cũng khó — mai ôn lại sẽ nhớ hơn." };
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

  const mood = cheer(pct);

  return (
    <div className="relative flex flex-1 flex-col py-6">
      {total > 0 && <Confetti />}
      {total > 0 && (
        <span aria-hidden className="animate-float self-center text-7xl">
          {mood.emoji}
        </span>
      )}
      <h1 className={cn("text-2xl text-ink", total > 0 && "mt-3 text-center")}>
        {total ? (
          <span className="highlighter highlighter-animate">Xong phiên rồi!</span>
        ) : (
          "Chưa có thẻ nào"
        )}
      </h1>
      {total > 0 && <p className="mt-2 text-center font-semibold text-ink">{mood.text}</p>}
      {tomorrowDue !== undefined && (
        <p className={cn("mt-1 text-ink-soft", total > 0 && "text-center")}>
          {tomorrowDue > 0
            ? `Ngày mai có ${tomorrowDue} từ cần ôn.`
            : "Ngày mai chưa có từ nào đến hạn."}
        </p>
      )}

      {total > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={total === 1 ? "thẻ" : "lượt"} value={String(total)} emoji="🃏" tone="bg-wash-grape" />
          <Stat label={correctLabel} value={`${pct}%`} emoji="🎯" tone="bg-wash-jade" />
          <Stat label="Thời gian" value={formatDuration(durationMs)} emoji="⏱️" tone="bg-wash-sky" />
          <Stat label="XP nhận được" value={`+${xp}`} emoji="⭐" tone="bg-wash-yellow" />
        </div>
      )}

      {sync.pending > 0 && (
        <p role="status" className="mt-4 rounded-btn bg-wash-yellow px-3 py-2 text-sm text-ink">
          Còn {sync.pending} kết quả chưa gửi được. Chúng được lưu trên máy và sẽ tự gửi khi có mạng
          — đừng xóa dữ liệu trình duyệt.
        </p>
      )}

      {missed.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-base text-ink">
            {missedTitle} ({missed.length})
          </h2>
          <ul className="ruled-list overflow-hidden rounded-card border border-rule bg-surface shadow-card">
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
          className="btn-3d inline-flex min-h-14 flex-1 items-center justify-center rounded-btn bg-primary px-4 text-lg font-extrabold text-primary-foreground [--edge-color:var(--ink-blue-shade)]"
        >
          Về trang Hôm nay
        </Link>
        {againHref && (
          <a
            href={againHref}
            className="btn-3d inline-flex min-h-14 flex-1 items-center justify-center rounded-btn border-2 border-rule bg-surface px-4 text-lg font-bold text-ink [--edge-color:var(--rule)]"
          >
            Luyện tiếp
          </a>
        )}
      </div>
    </div>
  );
}
