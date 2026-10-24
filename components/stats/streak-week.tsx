import { Flame } from "lucide-react";
import { addDays, weekStart, type Streak } from "@/lib/srs/streak";
import { cn } from "@/lib/utils";

const LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const STATE_TEXT = { done: "đã ôn", rest: "ngày nghỉ", future: "chưa tới", empty: "chưa ôn" } as const;

/**
 * "Chuỗi ngày": the streak number in Literata and this week's seven days as small squares
 * (Monday first): reviewed = turmeric, today = ringed, a free rest day = struck through,
 * days to come = a dot. No emoji.
 */
export function StreakWeek({
  streak,
  today,
  activeDays,
  className,
}: {
  streak: Streak;
  today: string;
  /** Study days that have at least one review */
  activeDays: string[];
  className?: string;
}) {
  const active = new Set(activeDays);
  const rest = new Set(streak.restDays);
  const first = weekStart(today);
  const days = LABELS.map((label, i) => {
    const day = addDays(first, i);
    const state: keyof typeof STATE_TEXT = active.has(day) ? "done" : rest.has(day) ? "rest" : day > today ? "future" : "empty";
    return { label, day, state, isToday: day === today };
  });
  return (
    <section aria-labelledby="streak-title" className={className}>
      <h2 id="streak-title" className="flex items-center gap-1.5 text-base">
        <Flame className="size-4 text-streak" strokeWidth={1.75} aria-hidden />
        Chuỗi ngày
      </h2>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="font-display text-[2rem] leading-none font-semibold text-fg tabular-nums">{streak.current}</span>
        <span className="text-sm text-fg-muted">ngày</span>
      </p>
      <ul aria-label="Tuần này" className="mt-3 grid grid-cols-7 gap-1.5">
        {days.map((d) => (
          <li key={d.day} className="flex flex-col items-center gap-1">
            <span
              className={cn(
                "relative grid size-8 place-items-center rounded-sm",
                d.state === "done" && "bg-streak",
                d.state === "empty" && "bg-surface-2",
                d.state === "rest" && "heat-rest bg-surface-2",
                d.state === "future" && "border border-dashed border-border-strong",
                d.isToday && "ring-2 ring-fg ring-offset-1 ring-offset-canvas",
              )}
            >
              <span className="sr-only">{`${d.label}: ${STATE_TEXT[d.state]}`}</span>
            </span>
            <span aria-hidden className={cn("text-xs", d.isToday ? "font-semibold text-fg" : "text-fg-muted")}>
              {d.label}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-fg-muted">
        {!streak.activeToday && streak.current > 0
          ? "Ôn 1 thẻ hôm nay để giữ chuỗi."
          : streak.restUsedThisWeek
            ? "Đã dùng ngày nghỉ của tuần."
            : "Còn 1 ngày nghỉ miễn phí tuần này."}
      </p>
    </section>
  );
}
