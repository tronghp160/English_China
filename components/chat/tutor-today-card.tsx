import { Flame } from "lucide-react";
import Link from "next/link";
import { LangMark } from "@/components/lang-mark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { startChat } from "@/lib/actions/chat";
import type { LangSnapshot } from "@/lib/ai/tutor/learner";
import type { getStudySummary } from "@/lib/data/study";

export function TutorTodayCard({
  snapshot,
  summary,
  tutorName = "Bin",
}: {
  snapshot: LangSnapshot[];
  summary: Awaited<ReturnType<typeof getStudySummary>>;
  tutorName?: string;
}) {
  const totalWords = summary.totalCards;
  const totalDue = summary.langs.reduce((sum, l) => sum + l.due, 0);

  // Collect all hard words across languages, limit to 6
  const hardWords = snapshot.flatMap((s) => s.hard).slice(0, 6);

  return (
    <Card className="p-4 space-y-3">
      <h2 className="text-base font-bold text-fg">Hôm nay của bạn</h2>

      {totalWords === 0 ? (
        <div className="space-y-3 py-1">
          <p className="text-sm text-fg-muted">
            Thêm từ vào sổ để {tutorName} giúp bạn ôn đúng từ của bạn.
          </p>
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href="/decks">Đến danh sách bộ từ</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Per-language counts */}
          <div className="space-y-1.5">
            {summary.langs.map((l) => (
              <div key={l.language} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <LangMark lang={l.language} />
                  <span className="font-semibold text-fg">
                    <span className="font-bold tabular-nums">{l.due}</span> đến hạn
                  </span>
                </div>
                <span className="tabular-nums text-xs text-fg-muted">{l.total} từ</span>
              </div>
            ))}
          </div>

          {/* Hard words chips */}
          {hardWords.length > 0 && (
            <div className="pt-1 space-y-1.5">
              <p className="text-xs font-semibold text-fg-muted">Từ hay quên:</p>
              <div className="flex flex-wrap gap-1.5">
                {hardWords.map((w, idx) => (
                  <form key={idx} action={startChat}>
                    <input
                      type="hidden"
                      name="prompt"
                      value={`Giải thích lại từ ${w.term} giúp mình, kèm ví dụ và mẹo nhớ.`}
                    />
                    <button
                      type="submit"
                      title={w.meaning_vi}
                      className="inline-flex min-h-10 items-center rounded-full bg-c-coral-soft px-3 text-sm font-semibold text-c-coral-fg transition-opacity hover:opacity-90 active:scale-95"
                    >
                      <span className="font-hanzi-sans">{w.term}</span>
                    </button>
                  </form>
                ))}
              </div>
            </div>
          )}

          {/* Streak */}
          {summary.streak.current > 0 && (
            <div className="flex items-center gap-2 text-sm font-semibold text-fg pt-1">
              <IconTile icon={Flame} tone="orange" size={32} />
              <span>
                Chuỗi <span className="tabular-nums font-bold text-c-orange-fg">{summary.streak.current}</span> ngày
              </span>
            </div>
          )}

          {/* Review button */}
          {totalDue > 0 && (
            <Button asChild variant="pressable" size="sm" className="w-full mt-2">
              <Link href="/review">Ôn {totalDue} từ đến hạn</Link>
            </Button>
          )}
        </>
      )}
    </Card>
  );
}
