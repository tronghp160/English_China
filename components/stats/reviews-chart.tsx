"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

/** Inverted tooltip (ink on paper), like the toasts. */
function Tip({ active, payload }: TooltipContentProps<number, string>) {
  const p = payload?.[0]?.payload as DayPoint | undefined;
  if (!active || !p) return null;
  const pct = p.reviews ? Math.round((p.correct / p.reviews) * 100) : 0;
  return (
    <div className="rounded-md bg-fg px-3 py-2 text-sm text-canvas shadow-lg">
      <p className="font-medium">{short(p.day)}</p>
      <p className="opacity-80">
        <span className="tabular-nums">{p.reviews}</span> lượt ôn
        {p.reviews > 0 && <>, nhớ {pct}%</>}
      </p>
    </div>
  );
}

/** Reviews per day for the last 30 days: one series in blue, today's bar the darkest (so no legend). */
export function ReviewsChart({ data }: { data: DayPoint[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="day"
            tickFormatter={short}
            tick={{ fill: "var(--fg-muted)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis allowDecimals={false} tick={{ fill: "var(--fg-muted)", fontSize: 12 }} tickLine={false} axisLine={false} width={32} />
          <Tooltip content={(props) => <Tip {...(props as TooltipContentProps<number, string>)} />} cursor={{ fill: "var(--surface-2)" }} />
          <Bar dataKey="reviews" radius={[8, 8, 0, 0]} maxBarSize={18} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={d.day} fill="var(--primary)" fillOpacity={i === data.length - 1 ? 1 : 0.62} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
