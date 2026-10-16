import { Flame } from "lucide-react";
import { UserAvatar } from "@/components/app-shell/user-menu";
import type { GroupView } from "@/lib/data/groups";
import { cn } from "@/lib/utils";

/** Weekly XP ranking (resets Monday 00:00 Vietnam time). */
export function Leaderboard({ rows, userId }: { rows: GroupView["leaderboard"]; userId: string }) {
  return (
    <section aria-labelledby="lb-title" className="rounded-[12px] border border-rule bg-surface">
      <div className="flex items-baseline justify-between gap-2 px-4 pt-4 pb-2">
        <h2 id="lb-title" className="font-bold text-ink">
          Bảng xếp hạng tuần
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
              className={cn("flex min-h-14 items-center gap-3 px-4 py-2", me && "bg-wash-blue")}
              aria-current={me ? "true" : undefined}
            >
              <span
                className={cn(
                  "w-6 shrink-0 text-center font-semibold tabular-nums",
                  i === 0 && r.xp > 0 ? "text-ink-blue" : "text-ink-soft",
                )}
              >
                {rank ?? "·"}
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
                <span className={cn("font-semibold text-ink tabular-nums", i === 0 && r.xp > 0 && "highlighter")}>
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
