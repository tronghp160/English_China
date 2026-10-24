import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Heatmap } from "@/components/stats/heatmap";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { summarize30, type DayStat } from "@/lib/stats";

export type ActivityCardProps = {
  days: DayStat[];
  today: string;
  restDays: string[];
  streakCurrent?: number;
};

export function ActivityCard({
  days,
  today,
  restDays,
}: ActivityCardProps) {
  const { reviews30, activeDays30, retention } = summarize30(days, today);

  return (
    <>
      <Card className="col-span-12 flex flex-col p-5 md:col-span-6 lg:col-span-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg">Hoạt động</h2>
          <Link
            href="/stats"
            className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-primary-fg hover:underline"
          >
            Xem thống kê
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>

        <div className="lg:hidden">
          <Heatmap days={days} today={today} restDays={restDays} weeks={12} />
        </div>
        <div className="hidden lg:block">
          <Heatmap fluid days={days} today={today} restDays={restDays} weeks={26} />
        </div>
      </Card>

      <Card className="col-span-12 flex h-full flex-col p-5 md:col-span-6 lg:col-span-4">
        <h2 className="text-lg">30 ngày qua</h2>

        <dl className="mt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <dt className="text-sm text-fg-muted">Lượt ôn</dt>
            <dd className="font-display text-xl tabular-nums">{reviews30}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-fg-muted">Nhớ đúng</dt>
            <dd className="font-display text-xl tabular-nums">
              {retention === null ? "—" : `${retention}%`}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-fg-muted">Ngày có học</dt>
            <dd className="font-display text-xl tabular-nums">{activeDays30}/30</dd>
          </div>
        </dl>

        <div className="mt-auto pt-4">
          <Button asChild variant="outline" className="w-full">
            <Link href="/stats">Xem thống kê</Link>
          </Button>
        </div>
      </Card>
    </>
  );
}
