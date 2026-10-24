"use client";

import { ChevronRight, MessageCircleHeart } from "lucide-react";
import Link from "next/link";
import { ProgressRing } from "@/components/stats/progress-ring";
import { Button } from "@/components/ui/button";
import { startChat } from "@/lib/actions/chat";
import { formatDuration } from "@/lib/format";
import type { LangCode } from "@/lib/lang/types";
import { summaryMood } from "@/lib/mascot/lines";
import { TONE_CLASSES, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { Celebration } from "./celebration";
import { useOutboxStatus } from "./session-bar";

export type SessionResult = {
  wordId: string;
  term: string;
  language: LangCode;
  meaning: string;
  rating: number;
};

/** One figure of the summary: a pale card, the number big in its hue, the label under it. */
function Kpi({ value, label, tone, className }: { value: string; label: string; tone: Tone; className?: string }) {
  return (
    <div className={cn("flex flex-col-reverse gap-0.5 rounded-lg p-3.5", TONE_CLASSES[tone].soft, TONE_CLASSES[tone].fg, className)}>
      <dt className="text-[0.8125rem] font-semibold">{label}</dt>
      <dd className="font-display text-[1.625rem] leading-tight tabular-nums">{value}</dd>
    </div>
  );
}

/** End of a review or practice session: the ring with the score and Bin, the figures, the words to look at again. */
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
      <header className="flex flex-col items-center gap-4 text-center">
        {total > 0 && (
          <Celebration mood={mood.mood} size={88}>
            <ProgressRing value={pct} size={184} stroke={16} barClassName="text-success">
              <span className="flex flex-col items-center leading-none">
                <span className="font-display text-[2.875rem] text-success-fg tabular-nums">{pct}%</span>
                <span className="mt-1.5 text-sm text-fg-muted">trả lời đúng</span>
              </span>
            </ProgressRing>
          </Celebration>
        )}
        <div className="min-w-0">
          <h1 className="text-[1.875rem]">{total ? "Xong phiên rồi!" : "Chưa có thẻ nào"}</h1>
          {total > 0 && (
            <p className="mt-1.5 text-fg">
              Bạn nhớ {remembered}/{total} thẻ. <span className="text-fg-muted">{mood.text}</span>
            </p>
          )}
          {tomorrowDue !== undefined && (
            <p className="mt-1 text-sm text-fg-muted">
              {tomorrowDue > 0 ? `Ngày mai có ${tomorrowDue} từ cần ôn.` : "Ngày mai chưa có từ nào đến hạn."}
            </p>
          )}
        </div>
      </header>

      {total > 0 && (
        <dl className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Kpi tone="blue" value={String(total)} label={total === 1 ? "thẻ" : "lượt"} />
          <Kpi tone="mint" value={`${remembered}/${total}`} label={correctLabel === "Nhớ" ? "thẻ nhớ" : correctLabel.toLowerCase()} />
          <Kpi tone="teal" value={formatDuration(durationMs)} label="thời gian" />
          <Kpi tone="grape" value={`+${xp}`} label="XP" />
        </dl>
      )}

      {sync.pending > 0 && (
        <p role="status" className="mt-4 rounded-md bg-streak-soft px-3 py-2 text-sm text-streak-fg">
          Còn {sync.pending} kết quả chưa gửi được. Chúng được lưu trên máy và sẽ tự gửi khi có mạng, đừng xóa dữ liệu trình duyệt.
        </p>
      )}

      {missed.length > 0 && (
        <section className="mt-8" aria-labelledby="summary-missed">
          <h2 id="summary-missed" className="mb-3 text-lg">
            {missedTitle} ({missed.length})
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border/60 bg-surface shadow-sm dark:border-border">
            {missed.map((m) => (
              <li key={m.wordId}>
                <Link href={`/words/${m.wordId}`} className="flex min-h-14 items-center gap-3 px-4 py-2 transition-colors hover:bg-surface-2">
                  <span lang={m.language === "zh" ? "zh-CN" : "en"} className={cn("text-lg font-medium text-fg", m.language === "zh" ? "font-hanzi-sans font-bold" : "font-bold")}>
                    {m.term}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-fg-muted">{m.meaning}</span>
                  <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
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
              <Button type="submit" variant="soft" tone="grape">
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
        <Button asChild size="xl" variant="pressable" className="flex-1">
          <Link href={exitHref}>Về trang Hôm nay</Link>
        </Button>
        {againHref && (
          <Button asChild size="xl" variant="outline" className="flex-1">
            <a href={againHref}>Luyện tiếp</a>
          </Button>
        )}
      </div>
    </div>
  );
}
