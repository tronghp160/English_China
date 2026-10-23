import type { Metadata } from "next";
import Link from "next/link";
import { LangFlag } from "@/components/lang-flag";
import { MascotSay } from "@/components/mascot/mascot-say";
import { Heatmap } from "@/components/stats/heatmap";
import { ReviewsChart } from "@/components/stats/reviews-chart";
import { getStudySummary } from "@/lib/data/study";
import { LANGUAGES } from "@/lib/lang/registry";
import type { PupMood } from "@/lib/mascot/lines";
import { addDays } from "@/lib/srs/streak";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { readPrefs } from "@/lib/validation";

export const metadata: Metadata = { title: "Thống kê" };

// Ordered by how well a word is known, so one hue from light to dark (sequential).
const STAGES = [
  { key: "new", label: "Chưa học", hint: "chưa ôn lần nào", tone: "heat-1" },
  { key: "learning", label: "Đang tập nhớ", hint: "vừa học hoặc vừa quên", tone: "heat-2" },
  { key: "young", label: "Đã nhớ", hint: "nhớ được vài ngày", tone: "heat-3" },
  { key: "mature", label: "Nhớ chắc", hint: "nhớ được từ 3 tuần trở lên", tone: "heat-4" },
] as const;

function Tile({
  emoji,
  value,
  label,
  note,
  tone,
}: {
  emoji: string;
  value: string;
  label: string;
  note: string;
  tone: string;
}) {
  return (
    <div className={cn("flex flex-col rounded-card p-4", tone)}>
      <span aria-hidden className="text-2xl leading-none">
        {emoji}
      </span>
      <p className="mt-3 font-heading text-3xl leading-none font-black text-ink tabular-nums">{value}</p>
      <p className="mt-1.5 font-semibold text-ink">{label}</p>
      <p className="text-sm text-ink-soft">{note}</p>
    </div>
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
    <section className="rounded-card border border-rule bg-surface p-4 shadow-card sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
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
      ? ["sleepy", "30 ngày qua mình chưa ôn bài nào. Ôn vài thẻ là biểu đồ có màu liền!"]
      : (retention ?? 0) >= 80
        ? ["cheer", `30 ngày qua bạn ôn ${reviews30} lượt và nhớ đúng ${retention}%. Đỉnh quá!`]
        : (retention ?? 0) >= 50
          ? ["happy", `30 ngày qua bạn ôn ${reviews30} lượt, nhớ đúng ${retention}%. Cứ đều đều là lên tay!`]
          : ["think", `30 ngày qua bạn nhớ đúng ${retention}%. Thử ôn ít mà đều mỗi ngày nha!`];

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-xl text-ink">Thống kê</h1>
        <p className="mt-0.5 text-ink-soft">Bạn học thế nào trong 30 ngày gần đây</p>
        {prefs.mascot && <MascotSay mood={mood} name={prefs.mascot_name} text={line} className="mt-3" />}
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          emoji="🧠"
          value={known.toLocaleString("vi-VN")}
          label="Từ đã nhớ"
          note={`trên tổng ${totalActive.toLocaleString("vi-VN")} từ`}
          tone="bg-wash-jade"
        />
        <Tile
          emoji="🃏"
          value={reviews30.toLocaleString("vi-VN")}
          label="Lượt ôn"
          note="trong 30 ngày"
          tone="bg-wash-grape"
        />
        <Tile
          emoji="🎯"
          value={retention === null ? "—" : `${retention}%`}
          label="Nhớ đúng"
          note="số lần trả lời đúng"
          tone="bg-wash-sky"
        />
        <Tile
          emoji="📅"
          value={`${activeDays30}/30`}
          label="Ngày có học"
          note={`chuỗi hiện tại: ${s.streak.current} ngày`}
          tone="bg-wash-yellow"
        />
      </div>

      <Section
        title="Mỗi ngày bạn ôn bao nhiêu"
        subtitle={
          reviews30
            ? `Ngày có học trung bình ${perActiveDay} lượt · nhiều nhất ${best.reviews} lượt (${Number(best.day.slice(8))}/${Number(best.day.slice(5, 7))})`
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
          <p className="py-8 text-center text-ink-soft">Chưa có lượt ôn nào trong 30 ngày qua.</p>
        )}
      </Section>

      <Section
        title="Bạn đã thuộc đến đâu"
        subtitle="Mỗi từ đi dần từ trái sang phải khi bạn ôn đúng"
        action={
          <Link
            href="/hard-words"
            className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-ink-blue hover:underline"
          >
            Từ hay quên →
          </Link>
        }
      >
        {langs.length === 0 && <p className="text-ink-soft">Chưa có từ nào.</p>}
        <div className="flex flex-col gap-6">
          {langs.map((lang) => {
            const total = STAGES.reduce((n, st) => n + count(st.key, lang), 0);
            const hidden = count("suspended", lang);
            return (
              <div key={lang}>
                <p className="mb-2 flex items-baseline justify-between gap-2 font-semibold text-ink">
                  <span>
                    <LangFlag lang={lang} /> {LANGUAGES[lang].label}
                  </span>
                  <span className="text-sm font-normal text-ink-soft tabular-nums">{total} từ</span>
                </p>
                {total > 0 && (
                  <div
                    className="flex h-5 gap-0.5 overflow-hidden rounded-full bg-surface"
                    role="img"
                    aria-label={STAGES.map((st) => `${st.label} ${count(st.key, lang)}`).join(", ")}
                  >
                    {STAGES.map((st) => {
                      const n = count(st.key, lang);
                      return n ? (
                        <span key={st.key} className={st.tone} style={{ width: `${(n / total) * 100}%` }} />
                      ) : null;
                    })}
                  </div>
                )}
                <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                  {STAGES.map((st) => (
                    <li key={st.key} className="flex items-start gap-2">
                      <span aria-hidden className={cn("mt-1 size-3 shrink-0 rounded-[3px]", st.tone)} />
                      <span className="min-w-0">
                        <span className="block text-sm text-ink">
                          {st.label} <span className="font-bold tabular-nums">{count(st.key, lang)}</span>
                        </span>
                        <span className="block text-xs text-ink-soft">{st.hint}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                {hidden > 0 && <p className="mt-2 text-xs text-ink-soft">Và {hidden} từ đang tạm ẩn.</p>}
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        title="Lịch học"
        subtitle="Mỗi ô là một ngày, càng đậm là ôn càng nhiều. Ô viền nét đứt là ngày nghỉ miễn phí, vẫn giữ chuỗi."
      >
        <Heatmap
          days={s.days.map((d) => ({ day: d.day, reviews: d.reviews }))}
          today={s.today}
          weeks={26}
          restDays={s.streak.restDays}
        />
      </Section>
    </div>
  );
}
