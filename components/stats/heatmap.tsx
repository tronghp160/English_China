"use client";

import { useState } from "react";
import { addDays, weekStart } from "@/lib/srs/streak";
import { cn } from "@/lib/utils";

export type HeatDay = { day: string; reviews: number };

function level(n: number) {
  if (n <= 0) return 0;
  if (n < 10) return 1;
  if (n < 25) return 2;
  if (n < 50) return 3;
  return 4;
}

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function label(day: string) {
  // "T6, 23/10": the weekday of the study day, then day/month
  const [, m, d] = day.split("-");
  const weekday = WEEKDAYS[(new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7];
  return `${weekday}, ${Number(d)}/${Number(m)}`;
}

/** GitHub-style activity grid: columns are weeks (Monday on top), `weeks` long, ending today. */
export function Heatmap({
  days,
  today,
  weeks = 12,
  restDays = [],
}: {
  days: HeatDay[];
  today: string;
  weeks?: number;
  restDays?: string[];
}) {
  const counts = new Map(days.map((d) => [d.day, d.reviews]));
  const rest = new Set(restDays);
  const first = addDays(weekStart(today), -7 * (weeks - 1));
  const columns = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d)),
  );
  const [hover, setHover] = useState<string | null>(null);
  const activeDays = days.filter((d) => d.reviews > 0 && d.day >= first).length;

  const describe = (day: string) => {
    const n = counts.get(day) ?? 0;
    if (rest.has(day)) return `${label(day)}: ngày nghỉ (giữ chuỗi)`;
    return `${label(day)}: ${n ? `${n} lượt ôn` : "không ôn"}`;
  };

  return (
    <figure className="m-0 flex flex-col gap-2" style={{ maxWidth: weeks * 30 + 32 }}>
      <div className="flex gap-1.5">
        <div
          className="grid grid-rows-7 gap-[3px] pr-0.5 text-[0.6875rem] leading-none text-fg-muted"
          aria-hidden
        >
          {WEEKDAYS.map((d, i) => (
            <span key={d} className={cn("flex h-full items-center", i % 2 === 1 && "invisible")}>
              {d}
            </span>
          ))}
        </div>
        <div
          className="grid flex-1 grid-flow-col grid-rows-7 gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}
          role="img"
          aria-label={`Hoạt động ${weeks} tuần qua: ôn ${activeDays} ngày`}
        >
          {columns.flat().map((day) => {
            const future = day > today;
            return (
              <span
                key={day}
                title={future ? undefined : describe(day)}
                onPointerEnter={() => setHover(day)}
                onPointerLeave={() => setHover((h) => (h === day ? null : h))}
                className={cn(
                  "heat-cell aspect-square w-full",
                  future ? "bg-transparent" : `heat-${level(counts.get(day) ?? 0)}`,
                  rest.has(day) && "heat-rest",
                  day === today && "ring-2 ring-fg ring-offset-1 ring-offset-surface",
                )}
              />
            );
          })}
        </div>
      </div>
      <figcaption className="flex min-h-5 flex-wrap items-center justify-between gap-2 text-xs text-fg-muted">
        <span aria-live="polite">
          {hover ? describe(hover) : `${activeDays} ngày có ôn trong ${weeks} tuần`}
        </span>
        <span className="flex items-center gap-1" aria-hidden>
          Ít
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className={cn("heat-cell size-2.5", `heat-${l}`)} />
          ))}
          Nhiều
        </span>
      </figcaption>
      <div className="sr-only">
        <table>
          <caption>Số lượt ôn mỗi ngày</caption>
          <tbody>
            {columns
              .flat()
              .filter((d) => d <= today && ((counts.get(d) ?? 0) > 0 || rest.has(d)))
              .map((d) => (
                <tr key={d}>
                  <td>{label(d)}</td>
                  <td>{rest.has(d) ? "ngày nghỉ" : `${counts.get(d)} lượt`}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
