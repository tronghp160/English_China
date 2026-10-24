import type { Metadata } from "next";
import Link from "next/link";
import { BookCheck, CalendarCheck, ChevronRight, Repeat2, Target, type LucideIcon } from "lucide-react";
import { LangMark } from "@/components/lang-mark";
import { MascotSay } from "@/components/mascot/mascot-say";
import { Heatmap } from "@/components/stats/heatmap";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import type { Tone } from "@/lib/tone";
import { ReviewsChart } from "@/components/stats/reviews-chart";
import { getStudySummary } from "@/lib/data/study";
import { LANGUAGES } from "@/lib/lang/registry";
import type { PupMood } from "@/lib/mascot/lines";
import { addDays } from "@/lib/srs/streak";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { readPrefs } from "@/lib/validation";

export const metadata: Metadata = { title: "Thống kê" };

// Ordered by how well a word is known: grey, sun, blue, mint, so "going right" reads as progress.
const STAGES = [
  { key: "new", label: "Chưa học", hint: "chưa ôn lần nào", tone: "bg-surface-3" },
  { key: "learning", label: "Đang tập nhớ", hint: "vừa học hoặc vừa quên", tone: "bg-c-sun" },
  { key: "young", label: "Đã nhớ", hint: "nhớ được vài ngày", tone: "bg-c-blue" },
  { key: "mature", label: "Nhớ chắc", hint: "nhớ được từ 3 tuần trở lên", tone: "bg-c-mint" },
] as const;

const FIGURE_FG: Record<string, string> = { blue: "text-c-blue-fg", grape: "text-c-grape-fg", mint: "text-c-mint-fg", sun: "text-c-sun-fg" };

/** One figure of the row: a pale card with an icon tile, the label, a big number and a note under it. */
function Figure({ value, label, note, tone, icon }: { value: string; label: string; note: string; tone: Tone; icon: LucideIcon }) {
  return (
    <Card variant="soft" tone={tone} className="p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        <IconTile icon={icon} tone={tone} size={32} solid />
        <p className={cn("text-sm font-semibold", FIGURE_FG[tone])}>{label}</p>
      </div>
      <p className={cn("mt-3 font-display text-[2.25rem] leading-none tabular-nums", FIGURE_FG[tone])}>{value}</p>
      <p className={cn("mt-2 text-xs", FIGURE_FG[tone])}>{note}</p>
    </Card>
  );
}

function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg">{title}</h2>
          {subtitle && <p className="mt-0.5 max-w-[62ch] text-sm text-fg-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

export default async function StatsPage() {
  const s = await getStudySummary();
  const prefs = readPrefs(s.me.settings.prefs);
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
  const retention = reviews30 ? Math.round((correct30 / reviews30) * 100) : null;
  const best = last30.reduce((a, b) => (b.reviews > a.reviews ? b : a), last30[0]);
  const perActiveDay = activeDays30 ? Math.round(reviews30 / activeDays30) : 0;

  const rows = dist ?? [];
  const langs = [...new Set(rows.map((d) => d.language))].sort();
  const count = (bucket: string, lang?: string) =>
    rows
      .filter((r) => r.bucket === bucket && (!lang || r.language === lang))
      .reduce((n, r) => n + Number(r.n), 0);
  const known = count("young") + count("mature");
  const totalActive = STAGES.reduce((n, st) => n + count(st.key), 0);

  const [mood, line]: [PupMood, string] =
    reviews30 === 0
      ? ["sleepy", "30 ngày qua chưa có bài nào. Ôn vài thẻ là biểu đồ có màu."]
      : (retention ?? 0) >= 80
        ? ["cheer", `30 ngày qua bạn ôn ${reviews30} lượt và nhớ đúng ${retention}%.`]
        : (retention ?? 0) >= 50
          ? ["happy", `30 ngày qua bạn ôn ${reviews30} lượt, nhớ đúng ${retention}%. Đều đều là lên tay.`]
          : ["think", `30 ngày qua bạn nhớ đúng ${retention}%. Thử ôn ít mà đều mỗi ngày.`];

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-[1.6875rem] sm:text-[2.125rem]">Thống kê</h1>
        <p className="mt-0.5 text-fg-muted">Bạn học thế nào trong 30 ngày gần đây</p>
        {prefs.mascot && <MascotSay mood={mood} name={prefs.mascot_name} text={line} size={48} className="mt-3" />}
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Figure tone="blue" icon={BookCheck} value={known.toLocaleString("vi-VN")} label="Từ đã nhớ" note={`trên tổng ${totalActive.toLocaleString("vi-VN")} từ`} />
        <Figure tone="grape" icon={Repeat2} value={reviews30.toLocaleString("vi-VN")} label="Lượt ôn" note="trong 30 ngày" />
        <Figure tone="mint" icon={Target} value={retention === null ? "—" : `${retention}%`} label="Nhớ đúng" note="số lần trả lời đúng" />
        <Figure tone="sun" icon={CalendarCheck} value={`${activeDays30}/30`} label="Ngày có học" note={`chuỗi hiện tại: ${s.streak.current} ngày`} />
      </div>

      <Section
        title="Mỗi ngày bạn ôn bao nhiêu"
        subtitle={
          reviews30
            ? `Ngày có học trung bình ${perActiveDay} lượt, nhiều nhất ${best.reviews} lượt (${Number(best.day.slice(8))}/${Number(best.day.slice(5, 7))}).`
            : undefined
        }
      >
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
          <p className="py-8 text-center text-fg-muted">Chưa có lượt ôn nào trong 30 ngày qua.</p>
        )}
      </Section>

      <Section
        title="Bạn đã thuộc đến đâu"
        subtitle="Mỗi từ đi dần từ trái sang phải khi bạn ôn đúng."
        action={
          <Link href="/hard-words" className="inline-flex min-h-11 shrink-0 items-center gap-0.5 text-sm font-semibold text-primary-fg hover:underline">
            Từ hay quên
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        }
      >
        {langs.length === 0 && <p className="text-fg-muted">Chưa có từ nào.</p>}
        <div className="flex flex-col gap-8">
          {langs.map((lang) => {
            const total = STAGES.reduce((n, st) => n + count(st.key, lang), 0);
            const hidden = count("suspended", lang);
            return (
              <div key={lang}>
                <p className="mb-2 flex items-center justify-between gap-2 font-medium">
                  <span className="flex items-center gap-2">
                    <LangMark lang={lang} />
                    {LANGUAGES[lang].label}
                  </span>
                  <span className="text-sm font-normal text-fg-muted tabular-nums">{total} từ</span>
                </p>
                {total > 0 && (
                  <div
                    className="flex h-3.5 gap-0.5 overflow-hidden rounded-full bg-surface-3"
                    role="img"
                    aria-label={STAGES.map((st) => `${st.label} ${count(st.key, lang)}`).join(", ")}
                  >
                    {STAGES.map((st) => {
                      const n = count(st.key, lang);
                      return n ? <span key={st.key} className={st.tone} style={{ width: `${(n / total) * 100}%` }} /> : null;
                    })}
                  </div>
                )}
                <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                  {STAGES.map((st) => (
                    <li key={st.key} className="flex items-start gap-2">
                      <span aria-hidden className={cn("mt-1 size-2.5 shrink-0 rounded-full", st.tone)} />
                      <span className="min-w-0">
                        <span className="block text-sm text-fg">
                          {st.label} <span className="font-semibold tabular-nums">{count(st.key, lang)}</span>
                        </span>
                        <span className="block text-xs text-fg-muted">{st.hint}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                {hidden > 0 && <p className="mt-2 text-xs text-fg-muted">Và {hidden} từ đang tạm ẩn.</p>}
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        title="Lịch học"
        subtitle="Mỗi ô là một ngày, càng đậm là ôn càng nhiều. Ô gạch chéo là ngày nghỉ miễn phí, vẫn giữ chuỗi."
      >
        <Heatmap days={s.days.map((d) => ({ day: d.day, reviews: d.reviews }))} today={s.today} weeks={26} restDays={s.streak.restDays} />
      </Section>
    </div>
  );
}
