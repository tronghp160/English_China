import { Flame } from "lucide-react";
import { UserAvatar } from "@/components/app-shell/user-menu";
import type { GroupView } from "@/lib/data/groups";
import { cn } from "@/lib/utils";

const MEDALS = ["🥇", "🥈", "🥉"];

/** Weekly XP ranking (resets Monday 00:00 Vietnam time). */
export function Leaderboard({ rows, userId }: { rows: GroupView["leaderboard"]; userId: string }) {
  return (
    <section aria-labelledby="lb-title" className="overflow-hidden rounded-card border border-rule bg-surface shadow-card">
      <div className="flex items-baseline justify-between gap-2 px-4 pt-4 pb-2">
        <h2 id="lb-title" className="text-ink">
          🏆 Bảng xếp hạng tuần
        </h2>
        <p className="text-xs text-ink-soft">Tính lại từ 0:00 thứ Hai</p>
      </div>
      <ol className="ruled-list">
        {rows.map((r, i) => {
          const me = r.user_id === userId;
          const rank = i > 0 && rows[i - 1].xp === r.xp ? null : i + 1;
          return (
            <li
              key={r.user_id}
              className={cn("flex min-h-16 items-center gap-3 px-4 py-2", me && "bg-wash-blue", i === 0 && r.xp > 0 && !me && "bg-wash-yellow")}
              aria-current={me ? "true" : undefined}
            >
              <span
                className={cn(
                  "w-7 shrink-0 text-center font-heading font-black tabular-nums",
                  rank && rank <= 3 && r.xp > 0 ? "text-2xl" : "text-ink-soft",
                )}
              >
                {rank && rank <= 3 && r.xp > 0 ? (
                  <>
                    <span aria-hidden>{MEDALS[rank - 1]}</span>
                    <span className="sr-only">{rank}</span>
                  </>
                ) : (
                  (rank ?? "·")
                )}
              </span>
              <UserAvatar name={r.display_name} url={r.avatar_url} className="size-9" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ink">
                  {r.display_name}
                  {me && <span className="font-normal text-ink-soft"> (bạn)</span>}
                </span>
                <span className="flex items-center gap-1 text-xs text-ink-soft">
                  {r.reviews.toLocaleString("vi-VN")} lượt ôn
                  {r.streak > 0 && (
                    <>
                      {" · "}
                      <Flame className="size-3.5 text-margin-red" aria-hidden />
                      <span>chuỗi {r.streak} ngày</span>
                    </>
                  )}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="font-heading text-lg font-black text-ink tabular-nums">
                  {r.xp.toLocaleString("vi-VN")}
                </span>
                <span className="block text-xs text-ink-soft">XP</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
