import Link from "next/link";
import { Flame, PenLine, UserPlus, Users } from "lucide-react";
import type { FeedItem } from "@/lib/data/groups";
import { formatAgo } from "@/lib/format";

function Line({ item }: { item: FeedItem }) {
  const name = <span className="font-medium text-ink">{item.name}</span>;
  switch (item.kind) {
    case "words":
      return (
        <>
          {name} vừa thêm {item.n} từ vào{" "}
          <Link href={`/decks/${item.deckId}`} className="font-medium text-ink-blue underline-offset-4 hover:underline">
            {item.deckName}
          </Link>
        </>
      );
    case "joined":
      return <>{name} đã vào nhóm</>;
    case "created":
      return <>{name} đã tạo nhóm</>;
    case "streak":
      return (
        <>
          {name} đang giữ chuỗi <span className="highlighter text-ink">{item.n} ngày</span>
        </>
      );
  }
}

const ICONS = { words: PenLine, joined: UserPlus, created: Users, streak: Flame } as const;

export function ActivityFeed({ items }: { items: FeedItem[] }) {
  return (
    <section aria-labelledby="feed-title" className="rounded-card border border-rule bg-surface">
      <h2 id="feed-title" className="px-4 pt-4 pb-2 text-ink">
        Hoạt động gần đây
      </h2>
      {items.length ? (
        <ul className="ruled-list">
          {items.map((item) => {
            const Icon = ICONS[item.kind];
            return (
              <li key={item.key} className="flex items-start gap-3 px-4 py-3 text-[0.9375rem] text-ink-soft">
                <Icon
                  className={item.kind === "streak" ? "mt-0.5 size-4 shrink-0 text-margin-red" : "mt-0.5 size-4 shrink-0"}
                  aria-hidden
                />
                <p className="min-w-0 flex-1">
                  <Line item={item} />
                  {"at" in item && <span className="block text-xs">{formatAgo(item.at)}</span>}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-4 pb-4 text-sm text-ink-soft">Chưa có hoạt động nào trong 14 ngày qua.</p>
      )}
    </section>
  );
}
