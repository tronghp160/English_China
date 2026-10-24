import { Ghost, MessageCircleHeart, Gamepad2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Celebration } from "@/components/review/celebration";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import type { Quest } from "@/lib/progress";
import type { Tone } from "@/lib/tone";
import { TONE_CLASSES } from "@/lib/tone";
import { cn } from "@/lib/utils";

type Suggestion = { href: string; title: string; hint: string; icon: LucideIcon; tone: Tone };

/** Shown by /review when no card is due: a pat on the back, what is left of today's quests and what to do next (REDESIGN_V3 §9.3). */
export function AllDone({
  tomorrowDue,
  quests,
  practiceHref,
  className,
}: {
  tomorrowDue: number;
  /** Today's quests (done or not); null when they could not be read. */
  quests: Quest[] | null;
  practiceHref: string;
  className?: string;
}) {
  const left = quests?.filter((q) => !q.done) ?? [];
  const suggestions: Suggestion[] = [
    { href: practiceHref, title: "Chơi một trò", hint: "Học, Kiểm tra, Ghép thẻ", icon: Gamepad2, tone: "grape" },
    { href: "/hard-words", title: "Từ hay quên", hint: "Luyện lại những từ khó", icon: Ghost, tone: "coral" },
    { href: "/chat", title: "Hỏi gia sư", hint: "Giải thích, mẹo nhớ", icon: MessageCircleHeart, tone: "mint" },
  ];

  return (
    <div className={cn("mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-3 py-6 text-center", className)}>
      <Celebration mood="cheer" confetti={false} />
      <h1 className="mt-4 text-xl">Bạn đã ôn xong hôm nay.</h1>
      <p className="text-fg-muted">
        {tomorrowDue > 0 ? `Ngày mai có ${tomorrowDue} từ cần ôn.` : "Thêm từ mới để có thẻ ôn ngày mai."}
      </p>

      {quests && (
        <section aria-labelledby="done-quests" className="mt-3 w-full rounded-lg bg-surface p-4 text-left shadow-sm dark:border dark:border-border">
          <h2 id="done-quests" className="text-base font-extrabold">
            {left.length ? "Nhiệm vụ còn lại hôm nay" : "Đã xong cả 3 nhiệm vụ hôm nay"}
          </h2>
          {left.length > 0 && (
            <ul className="mt-3 flex flex-col gap-3">
              {left.map((q) => (
                <li key={q.id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-semibold">{q.title}</span>
                    <span className="text-fg-muted tabular-nums">
                      {q.progress}/{q.target}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={q.title}
                    aria-valuemin={0}
                    aria-valuemax={q.target}
                    aria-valuenow={q.progress}
                    className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-3"
                  >
                    <span className="block h-full rounded-full bg-c-mint" style={{ width: `${Math.round((q.progress / q.target) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm text-fg-muted">
            {left.length ? "Phần thưởng nhận ở trang Hôm nay khi xong." : "Nhận phần thưởng ở trang Hôm nay nếu chưa nhận."}
          </p>
        </section>
      )}

      <section aria-labelledby="done-next" className="mt-3 w-full text-left">
        <h2 id="done-next" className="mb-2 text-base font-extrabold">
          Gợi ý cho bạn
        </h2>
        <ul className="grid gap-2.5 sm:grid-cols-3">
          {suggestions.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className={cn(
                  "flex min-h-[4.5rem] items-center gap-3 rounded-lg p-3.5 transition-transform hover:-translate-y-0.5 active:translate-y-0 sm:flex-col sm:items-start",
                  TONE_CLASSES[s.tone].soft,
                )}
              >
                <IconTile icon={s.icon} tone={s.tone} size={40} solid />
                <span className="min-w-0">
                  <span className={cn("block font-extrabold", TONE_CLASSES[s.tone].fg)}>{s.title}</span>
                  <span className={cn("block text-sm", TONE_CLASSES[s.tone].fg)}>{s.hint}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-3 flex w-full flex-wrap justify-center gap-2">
        <Button asChild size="lg" variant="pressable">
          <Link href="/today">Về trang Hôm nay</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href={practiceHref}>Luyện tập thêm</Link>
        </Button>
      </div>
    </div>
  );
}
