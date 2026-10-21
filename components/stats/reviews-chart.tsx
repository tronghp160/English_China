"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

export type DayPoint = { day: string; reviews: number; correct: number };

function short(day: string) {
  const [, m, d] = day.split("-");
  return `${Number(d)}/${Number(m)}`;
}

function Tip({ active, payload }: TooltipContentProps<number, string>) {
  const p = payload?.[0]?.payload as DayPoint | undefined;
  if (!active || !p) return null;
  const pct = p.reviews ? Math.round((p.correct / p.reviews) * 100) : 0;
  return (
    <div className="rounded-btn border border-rule bg-surface px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-ink">{short(p.day)}</p>
      <p className="text-ink-soft">
        <span className="text-ink tabular-nums">{p.reviews}</span> lượt ôn
        {p.reviews > 0 && <> · nhớ {pct}%</>}
      </p>
    </div>
  );
}

/** Reviews per day for the last 30 days (single series, so no legend). */
export function ReviewsChart({ data }: { data: DayPoint[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 4, bottom: 0, left: -20 }}
          barCategoryGap={2}
        >
          <CartesianGrid vertical={false} stroke="var(--rule)" strokeDasharray="3 3" />
          <XAxis
            dataKey="day"
            tickFormatter={short}
            tick={{ fill: "var(--ink-soft)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--rule)" }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "var(--ink-soft)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            content={(props) => <Tip {...(props as TooltipContentProps<number, string>)} />}
            cursor={{ fill: "var(--muted)" }}
          />
          <Bar
            dataKey="reviews"
            fill="var(--ink-blue)"
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
