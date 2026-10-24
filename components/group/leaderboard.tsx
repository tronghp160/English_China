import { Flame } from "lucide-react";
import { UserAvatar } from "@/components/app-shell/user-menu";
import { SealStamp } from "@/components/review/seal-stamp";
import type { GroupView } from "@/lib/data/groups";
import { cn } from "@/lib/utils";

/** Weekly XP ranking as a score book (resets Monday 00:00 Vietnam time): serif rank, XP on the right, one seal for first place. */
export function Leaderboard({ rows, userId }: { rows: GroupView["leaderboard"]; userId: string }) {
  return (
    <section aria-labelledby="lb-title">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="lb-title" className="text-lg">
          Bảng xếp hạng tuần
        </h2>
        <p className="text-sm text-ink-soft">Tính lại từ 0:00 thứ Hai</p>
      </div>
      <ol className="ruled-list mt-3 border-y border-rule">
        {rows.map((r, i) => {
          const me = r.user_id === userId;
          const rank = i > 0 && rows[i - 1].xp === r.xp ? null : i + 1;
          return (
            <li key={r.user_id} className={cn("flex min-h-16 items-center gap-3 px-2 py-2", me && "bg-tint-violet")} aria-current={me ? "true" : undefined}>
              <span className="w-7 shrink-0 text-center font-display text-xl font-semibold text-ink-soft tabular-nums">{rank ?? ""}</span>
              <UserAvatar name={r.display_name} url={r.avatar_url} className="size-9" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-medium text-ink">
                    {r.display_name}
                    {me && <span className="font-normal text-ink-soft"> (bạn)</span>}
                  </span>
                  {rank === 1 && r.xp > 0 && <SealStamp text="Nhất" size={32} animate={false} />}
                </span>
                <span className="flex flex-wrap items-center gap-x-3 text-xs text-ink-soft">
                  <span>{r.reviews.toLocaleString("vi-VN")} lượt ôn</span>
                  {r.streak > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Flame className="size-3.5 text-turmeric" aria-hidden />
                      chuỗi {r.streak} ngày
                    </span>
                  )}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="font-display text-lg font-semibold text-ink tabular-nums">{r.xp.toLocaleString("vi-VN")}</span>
                <span className="ml-1 text-xs text-ink-soft">XP</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
