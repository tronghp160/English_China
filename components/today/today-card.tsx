"use client";

import { Shield } from "lucide-react";
import { useBinHome } from "@/components/mascot/bin-home-provider";
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
  scarves?: number;
  className?: string;
};

export function TodayCard({
  streak,
  today,
  activeDays,
  reviewedToday,
  correctToday,
  xpToday,
  scarves,
  className,
}: TodayCardProps) {
  const pct = reviewedToday > 0 ? Math.round((correctToday / reviewedToday) * 100) : 0;
  const home = useBinHome();

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
        {scarves !== undefined && scarves > 0 ? (
          <p className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-streak-fg">
            <Shield className="size-3.5 shrink-0" aria-hidden />
            <span>Có {scarves} khăn giữ chuỗi</span>
          </p>
        ) : scarves === 0 && streak.current >= 3 ? (
          <button
            type="button"
            onClick={() => home?.open("decor:special")}
            className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-streak-fg underline-offset-4 hover:underline cursor-pointer"
          >
            <Shield className="size-3.5 shrink-0" aria-hidden />
            <span>Mua khăn giữ chuỗi</span>
          </button>
        ) : null}
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
