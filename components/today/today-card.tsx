import { StreakWeek } from "@/components/stats/streak-week";
import { Card } from "@/components/ui/card";
import type { Streak } from "@/lib/srs/streak";
import { cn } from "@/lib/utils";

export type TodayCardProps = {
  streak: Streak;
  today: string;
  activeDays: string[];
  reviewedToday: number;
  correctToday: number;
  xpToday: number;
  className?: string;
};

export function TodayCard({
  streak,
  today,
  activeDays,
  reviewedToday,
  correctToday,
  xpToday,
  className,
}: TodayCardProps) {
  const pct = reviewedToday > 0 ? Math.round((correctToday / reviewedToday) * 100) : 0;

  return (
    <Card
      aria-labelledby="today-card-title"
      className={cn("flex h-full flex-col gap-4 p-5", className)}
    >
      <h2 id="today-card-title" className="sr-only">
        Hôm nay của bạn
      </h2>

      <div className="rounded-lg bg-streak-soft p-4 text-streak-fg">
        <StreakWeek bare streak={streak} today={today} activeDays={activeDays} />
      </div>

      <div className="mt-auto grid grid-cols-3 gap-2">
        <div className="rounded-md bg-surface-2 p-3 text-center">
          <p className="font-display text-2xl tabular-nums">{reviewedToday}</p>
          <p className="text-xs text-fg-muted">Lượt ôn</p>
        </div>
        <div className="rounded-md bg-surface-2 p-3 text-center">
          <p className="font-display text-2xl tabular-nums">{reviewedToday > 0 ? `${pct}%` : "—"}</p>
          <p className="text-xs text-fg-muted">Nhớ đúng</p>
        </div>
        <div className="rounded-md bg-surface-2 p-3 text-center">
          <p className="font-display text-2xl tabular-nums">{xpToday}</p>
          <p className="text-xs text-fg-muted">XP</p>
        </div>
      </div>
    </Card>
  );
}
