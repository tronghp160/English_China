import type { Metadata } from "next";
import { Heatmap } from "@/components/stats/heatmap";
import { ReviewsChart } from "@/components/stats/reviews-chart";
import { getStudySummary } from "@/lib/data/study";
import { LANGUAGES } from "@/lib/lang/registry";
import { addDays } from "@/lib/srs/streak";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Thống kê" };

// Ordered by maturity, so one hue from light to dark (sequential).
const BUCKETS = [
  { key: "new", label: "Mới", tone: "heat-1" },
  { key: "learning", label: "Đang học", tone: "heat-2" },
  { key: "young", label: "Mới thuộc", tone: "heat-3" },
  { key: "mature", label: "Đã thuộc (≥ 21 ngày)", tone: "heat-4" },
  { key: "suspended", label: "Tạm ẩn", tone: "bg-rule" },
] as const;

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-[12px] border border-rule bg-surface p-4">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-ink tabular-nums">{value}</p>
      {note && <p className="mt-0.5 text-xs text-ink-soft">{note}</p>}
    </div>
  );
}

export default async function StatsPage() {
  const s = await getStudySummary();
  const supabase = await createClient();
  const { data: dist } = await supabase.rpc("card_distribution");

  const byDay = new Map(s.days.map((d) => [d.day, d]));
  const last30 = Array.from({ length: 30 }, (_, i) => addDays(s.today, i - 29)).map((day) => ({
    day,
    reviews: byDay.get(day)?.reviews ?? 0,
    correct: byDay.get(day)?.correct ?? 0,
  }));
  const reviews30 = last30.reduce((n, d) => n + d.reviews, 0);
  const correct30 = last30.reduce((n, d) => n + d.correct, 0);
  const activeDays30 = last30.filter((d) => d.reviews > 0).length;
  const xp30 = last30.reduce((n, d) => n + (byDay.get(d.day)?.xp ?? 0), 0);
  const retention = reviews30 ? Math.round((correct30 / reviews30) * 100) : null;

  const langs = [...new Set((dist ?? []).map((d) => d.language))].sort();
  const counts = (lang: string) => {
    const rows = (dist ?? []).filter((d) => d.language === lang);
    const total = rows.reduce((n, r) => n + Number(r.n), 0);
    return { total, get: (b: string) => Number(rows.find((r) => r.bucket === b)?.n ?? 0) };
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-ink">Thống kê</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Lượt ôn 30 ngày" value={reviews30.toLocaleString("vi-VN")} />
        <Tile
          label="Tỉ lệ nhớ"
          value={retention === null ? "—" : `${retention}%`}
          note="30 ngày qua"
        />
        <Tile
          label="Chuỗi ngày"
          value={String(s.streak.current)}
          note={`${activeDays30}/30 ngày có ôn`}
        />
        <Tile label="XP 30 ngày" value={xp30.toLocaleString("vi-VN")} />
      </div>

      <section className="rounded-[12px] border border-rule bg-surface p-4">
        <h2 className="mb-3 text-sm font-medium text-ink-soft">Số lượt ôn mỗi ngày</h2>
        {reviews30 ? (
          <>
            <ReviewsChart data={last30} />
            <div className="sr-only">
              <table>
                <caption>Số lượt ôn mỗi ngày, 30 ngày qua</caption>
                <tbody>
                  {last30
                    .filter((d) => d.reviews)
                    .map((d) => (
                      <tr key={d.day}>
                        <td>{d.day}</td>
                        <td>{d.reviews} lượt</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-ink-soft">Chưa có lượt ôn nào trong 30 ngày qua.</p>
        )}
      </section>

      <section className="rounded-[12px] border border-rule bg-surface p-4">
        <h2 className="mb-3 text-sm font-medium text-ink-soft">Trạng thái thẻ</h2>
        {langs.length === 0 && <p className="text-ink-soft">Chưa có thẻ nào.</p>}
        <div className="flex flex-col gap-6">
          {langs.map((lang) => {
            const c = counts(lang);
            return (
              <div key={lang}>
                {langs.length > 1 && (
                  <p className="mb-2 font-medium text-ink">
                    <span aria-hidden>{LANGUAGES[lang].flag}</span> {LANGUAGES[lang].label} ·{" "}
                    {c.total} từ
                  </p>
                )}
                <ul className="flex flex-col gap-2">
                  {BUCKETS.map((b) => {
                    const n = c.get(b.key);
                    const pct = c.total ? (n / c.total) * 100 : 0;
                    return (
                      <li
                        key={b.key}
                        className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-3 text-sm sm:grid-cols-[11rem_1fr_3rem]"
                      >
                        <span className="text-ink">{b.label}</span>
                        <span className="h-3 overflow-hidden rounded-full bg-muted">
                          <span
                            className={cn("block h-full rounded-full", b.tone)}
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                        <span className="text-right text-ink tabular-nums">{n}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[12px] border border-rule bg-surface p-4">
        <h2 className="mb-3 text-sm font-medium text-ink-soft">26 tuần gần đây</h2>
        <Heatmap
          days={s.days.map((d) => ({ day: d.day, reviews: d.reviews }))}
          today={s.today}
          weeks={26}
          restDays={s.streak.restDays}
        />
      </section>
    </div>
  );
}
