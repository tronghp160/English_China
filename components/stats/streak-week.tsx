import { Check, Flame, Snowflake } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";
import { addDays, weekStart, type Streak } from "@/lib/srs/streak";
import { cn } from "@/lib/utils";

const LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const STATE_TEXT = { done: "đã ôn", rest: "ngày nghỉ", future: "chưa tới", empty: "chưa ôn" } as const;

/**
 * "Chuỗi ngày" (REDESIGN_V2 §6.2): a pale sun card with the streak number and this week's seven days
 * (Monday first): reviewed = sun dot with a check, a free rest day = snowflake, today not yet reviewed = dashed ring,
 * days to come = faint dot.
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
    <section
      aria-labelledby="streak-title"
      className={cn("flex flex-col gap-3.5 rounded-lg bg-streak-soft p-5 text-streak-fg", className)}
    >
      <div className="flex items-center gap-2.5">
        <IconTile icon={Flame} tone="sun" size={32} solid className="text-white [&_svg]:fill-white [&_svg]:stroke-[var(--streak-fg)]" />
        <h2 id="streak-title" className="text-base font-bold">
          Chuỗi ngày
        </h2>
        <p className="ml-auto flex items-baseline gap-1">
          <span className="font-display text-[1.875rem] leading-none tabular-nums">{streak.current}</span>
          <span className="text-sm font-semibold">ngày</span>
        </p>
      </div>
      <ul aria-label="Tuần này" className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold">
        {days.map((d) => (
          <li key={d.day} className="flex flex-col items-center gap-1">
            <span
              className={cn(
                "grid size-[1.625rem] place-items-center rounded-full sm:size-[1.875rem]",
                d.state === "done" && "bg-streak text-white",
                d.state === "empty" && !d.isToday && "bg-surface",
                d.state === "rest" && "bg-surface text-streak-fg",
                d.state === "empty" && d.isToday && "border-2 border-dashed border-streak-fg/60",
                d.state === "future" && "border border-dashed border-streak-fg/30",
              )}
            >
              {d.state === "done" && <Check className="size-4" strokeWidth={3.2} aria-hidden />}
              {d.state === "rest" && <Snowflake className="size-3.5" aria-hidden />}
              <span className="sr-only">{`${d.label}: ${STATE_TEXT[d.state]}`}</span>
            </span>
            <span aria-hidden className={cn(d.isToday && "font-extrabold")}>
              {d.label}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[0.8125rem]">
        {!streak.activeToday && streak.current > 0
          ? "Ôn 1 thẻ hôm nay để giữ chuỗi."
          : streak.restUsedThisWeek
            ? "Đã dùng ngày nghỉ của tuần."
            : "Còn 1 ngày nghỉ miễn phí tuần này."}
      </p>
    </section>
  );
}
