"use client";

import { ChevronRight, MessageCircleHeart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useMe } from "@/components/app-shell/me-provider";
import { EndPup } from "@/components/mascot/end-pup";
import { Button } from "@/components/ui/button";
import { startChat } from "@/lib/actions/chat";
import { formatDuration } from "@/lib/format";
import type { LangCode } from "@/lib/lang/types";
import { summaryMood } from "@/lib/mascot/lines";
import { cn } from "@/lib/utils";
import { SealStamp } from "./seal-stamp";
import { useOutboxStatus } from "./session-bar";

export type SessionResult = {
  wordId: string;
  term: string;
  language: LangCode;
  meaning: string;
  rating: number;
};

/** One line of the score table: label on the left, a serif tabular number on the right. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-rule py-3">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="font-display text-xl font-semibold text-ink tabular-nums">{value}</dd>
    </div>
  );
}

/** Today's date as "24.10", the way a teacher dates a seal. */
function stampDate() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** End of a review or practice session (§10.3): the seal, the score as a ruled table, the words to look at again. */
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
  const { prefs } = useMe();
  const [date] = useState(stampDate);
  const total = results.length;
  const remembered = results.filter((r) => r.rating > 1).length;
  const pct = total ? Math.round((remembered / total) * 100) : 0;
  const missed = [...new Map(results.filter((r) => r.rating === 1).map((r) => [r.wordId, r])).values()];

  const mood = summaryMood(pct);
  // A session can mix languages; the tutor thread uses the one most missed.
  const missedLang: LangCode | undefined = missed.length
    ? missed.filter((m) => m.language === "zh").length > missed.length / 2
      ? "zh"
      : "en"
    : undefined;
  const missedTerms = missed.filter((m) => m.language === missedLang).slice(0, 15).map((m) => m.term);

  return (
    <div className="flex flex-1 flex-col py-6">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl">{total ? "Xong phiên rồi!" : "Chưa có thẻ nào"}</h1>
          {total > 0 && (
            <p className="mt-2 text-ink">
              Bạn nhớ {remembered}/{total} thẻ. <span className="text-ink-soft">{mood.text}</span>
            </p>
          )}
          {tomorrowDue !== undefined && (
            <p className="mt-1 text-sm text-ink-soft">
              {tomorrowDue > 0 ? `Ngày mai có ${tomorrowDue} từ cần ôn.` : "Ngày mai chưa có từ nào đến hạn."}
            </p>
          )}
        </div>
        {total > 0 && (
          <div className="flex shrink-0 items-end gap-1">
            {prefs.mascot && <EndPup mood={mood.mood} size={88} className="self-end" />}
            <SealStamp text="Đã ôn" sub={date} size={88} />
          </div>
        )}
      </header>

      {total > 0 && (
        <dl className="mt-6 border-t border-rule">
          <Row label={total === 1 ? "Số thẻ" : "Số lượt"} value={String(total)} />
          <Row label={correctLabel === "Nhớ" ? "Nhớ đúng" : correctLabel} value={`${pct}%`} />
          <Row label="Thời gian" value={formatDuration(durationMs)} />
          <Row label="XP" value={`+${xp}`} />
        </dl>
      )}

      {sync.pending > 0 && (
        <p role="status" className="mt-4 rounded-btn bg-tint-turmeric px-3 py-2 text-sm text-ink">
          Còn {sync.pending} kết quả chưa gửi được. Chúng được lưu trên máy và sẽ tự gửi khi có mạng, đừng xóa dữ liệu trình duyệt.
        </p>
      )}

      {missed.length > 0 && (
        <section className="mt-8" aria-labelledby="summary-missed">
          <h2 id="summary-missed" className="mb-2 text-base">
            {missedTitle} ({missed.length})
          </h2>
          <ul className="ruled-list border-y border-rule">
            {missed.map((m) => (
              <li key={m.wordId}>
                <Link href={`/words/${m.wordId}`} className="flex min-h-14 items-center gap-3 px-1 py-2 transition-colors hover:bg-surface-sunk">
                  <span lang={m.language === "zh" ? "zh-CN" : "en"} className={cn("text-lg font-medium text-ink", m.language === "zh" ? "font-hanzi" : "font-display")}>
                    {m.term}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{m.meaning}</span>
                  <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={startChat}>
              <input type="hidden" name="language" value={missedLang} />
              <input
                type="hidden"
                name="prompt"
                value={`Mình vừa quên các từ: ${missedTerms.join(", ")}. Giúp mình nhớ chúng: giải thích ngắn, cho mẹo nhớ, rồi hỏi lại mình từng từ.`}
              />
              <Button type="submit" variant="secondary">
                <MessageCircleHeart aria-hidden />
                Hỏi gia sư về các từ này
              </Button>
            </form>
            <Button asChild variant="outline">
              <Link href={`/hard-words?lang=${missedLang}`}>Từ hay quên</Link>
            </Button>
          </div>
        </section>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-8 sm:flex-row">
        <Button asChild size="lg" className="flex-1">
          <Link href={exitHref}>Về trang Hôm nay</Link>
        </Button>
        {againHref && (
          <Button asChild size="lg" variant="outline" className="flex-1">
            <a href={againHref}>Luyện tiếp</a>
          </Button>
        )}
      </div>
    </div>
  );
}
