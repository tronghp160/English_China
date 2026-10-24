import { Flame } from "lucide-react";
import { UserAvatar } from "@/components/app-shell/user-menu";
import type { GroupView } from "@/lib/data/groups";
import { cn } from "@/lib/utils";

type Row = GroupView["leaderboard"][number];

// Podium blocks: first place is the tallest and sun yellow, then a soft grey, then orange.
const PODIUM = [
  { place: 1, height: "h-28", block: "bg-c-sun text-c-sun-fg" },
  { place: 2, height: "h-20", block: "bg-surface-3 text-fg-muted" },
  { place: 3, height: "h-14", block: "bg-c-orange-soft text-c-orange-fg" },
] as const;

function Podium({ rows, userId }: { rows: Row[]; userId: string }) {
  // Visual order: second, first, third.
  const order = [1, 0, 2].filter((i) => rows[i]);
  return (
    <ol aria-label="Ba người đứng đầu" className="grid grid-cols-3 items-end gap-2 sm:gap-4">
      {order.map((i) => {
        const r = rows[i];
        const p = PODIUM[i];
        const me = r.user_id === userId;
        return (
          <li key={r.user_id} className="flex min-w-0 flex-col items-center gap-1.5" aria-current={me ? "true" : undefined}>
            <UserAvatar name={r.display_name} url={r.avatar_url} seed={r.user_id} className={cn("ring-4 ring-surface", i === 0 ? "size-16" : "size-12")} />
            <span className="max-w-full truncate text-center text-sm font-bold text-fg">
              {r.display_name}
              {me && <span className="font-normal text-fg-muted"> (bạn)</span>}
            </span>
            <span className="text-xs text-fg-muted tabular-nums">
              <b className="font-display text-sm text-xp-fg">{r.xp.toLocaleString("vi-VN")}</b> XP
            </span>
            <span className={cn("grid w-full place-items-start justify-items-center rounded-t-lg pt-2 font-display text-2xl", p.height, p.block)}>
              <span className="sr-only">Hạng </span>
              {p.place}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Weekly XP ranking (resets Monday 00:00 Vietnam time): a podium for the top three, then a plain list; your row is highlighted. */
export function Leaderboard({ rows, userId }: { rows: GroupView["leaderboard"]; userId: string }) {
  const podium = rows.length >= 3 && rows[0].xp > 0 ? rows.slice(0, 3) : [];
  const rest = rows.slice(podium.length);
  return (
    <section aria-labelledby="lb-title">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="lb-title" className="text-xl">
          Bảng xếp hạng tuần
        </h2>
        <p className="text-sm text-fg-muted">Tính lại từ 0:00 thứ Hai</p>
      </div>

      {podium.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-xl bg-primary-soft px-4 pt-6 sm:px-8">
          <Podium rows={podium} userId={userId} />
        </div>
      )}

      {rest.length > 0 && (
        <ol
          start={podium.length + 1}
          className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border/60 bg-surface shadow-sm dark:border-border"
        >
          {rest.map((r, i) => {
            const me = r.user_id === userId;
            const index = podium.length + i;
            const rank = index > 0 && rows[index - 1].xp === r.xp ? null : index + 1;
            return (
              <li key={r.user_id} className={cn("flex min-h-16 items-center gap-3 px-4 py-2", me && "bg-primary-soft")} aria-current={me ? "true" : undefined}>
                <span className="w-7 shrink-0 text-center font-display text-lg text-fg-muted tabular-nums">{rank ?? ""}</span>
                <UserAvatar name={r.display_name} url={r.avatar_url} seed={r.user_id} className="size-10" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-fg">
                    {r.display_name}
                    {me && <span className="font-normal text-fg-muted"> (bạn)</span>}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-3 text-xs text-fg-muted">
                    <span>{r.reviews.toLocaleString("vi-VN")} lượt ôn</span>
                    {r.streak > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Flame className="size-3.5 text-c-sun" aria-hidden />
                        chuỗi {r.streak} ngày
                      </span>
                    )}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-xp-soft px-2.5 py-0.5 text-right text-xp-fg">
                  <span className="font-display text-base tabular-nums">{r.xp.toLocaleString("vi-VN")}</span>
                  <span className="ml-1 text-xs font-semibold">XP</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
