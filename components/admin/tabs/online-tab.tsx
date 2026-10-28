import Link from "next/link";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { DeviceChip } from "@/components/admin/device-chip";
import { OnlineDot } from "@/components/admin/online-dot";
import { PlaceLine } from "@/components/admin/place-line";
import { UserAvatar } from "@/components/app-shell/user-menu";
import { Badge } from "@/components/ui/badge";
import { ago } from "@/lib/admin-format";
import { getOnlineNow, type OnlineRow } from "@/lib/data/admin-monitor";
import { describePath } from "@/lib/presence";

export async function OnlineTab({ meId }: { meId: string }) {
  const { online, away } = await getOnlineNow();

  const renderUser = (u: OnlineRow) => {
    const isMe = u.userId === meId;
    return (
      <li
        key={u.userId}
        className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-sm sm:flex-row sm:items-center dark:border dark:border-border"
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <UserAvatar
            name={u.displayName}
            url={u.avatarUrl}
            seed={u.username || u.userId}
            className="size-10 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <OnlineDot status={u.status} />
              <Link href={`/admin/users/${u.userId}`} className="font-bold hover:underline">
                {u.displayName}
              </Link>
              {u.username && <span className="text-sm text-fg-muted">@{u.username}</span>}
              {isMe && (
                <Badge variant="soft" tone="blue">
                  Bạn
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm font-medium text-primary">
              {describePath(u.path)}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
              <PlaceLine city={u.city} region={u.region} country={u.country} ip={u.ip} />
              <span>·</span>
              <DeviceChip deviceType={u.deviceType} browser={u.browser} os={u.os} />
              <span>·</span>
              <span>Online {ago(u.lastSeenAt)}</span>
            </div>
          </div>
        </div>
      </li>
    );
  };

  return (
    <section aria-label="Đang online" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-muted">
          Cập nhật theo nhịp 45 giây của trình duyệt người dùng.
        </p>
        <AutoRefresh seconds={30} />
      </div>

      {/* Online now */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-fg">
          Đang online ({online.length})
        </h3>
        {online.length === 0 ? (
          <p className="rounded-lg bg-surface p-6 text-center text-sm text-fg-muted shadow-sm dark:border dark:border-border">
            Hiện không có ai online.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">{online.map(renderUser)}</ul>
        )}
      </div>

      {/* Away in last 15 min */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-fg">
          Vừa rời đi trong 15 phút qua ({away.length})
        </h3>
        {away.length === 0 ? (
          <p className="rounded-lg bg-surface p-6 text-center text-sm text-fg-muted shadow-sm dark:border dark:border-border">
            Không có ai vừa rời đi.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">{away.map(renderUser)}</ul>
        )}
      </div>
    </section>
  );
}
